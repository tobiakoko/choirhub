-- 0010_invite_codes_and_onboarding.sql
-- Onboarding (docs/choirhub-system-design-v2.md §5): phone OTP → location-scoped
-- invite code → voice-part selection → leader approval → route into the app.
--
-- Adds:
--   * membership_status on profiles (pending until a leader approves)
--   * invite_codes — location-scoped, expiring, revocable, max-uses
--   * status-gated read helpers so a *pending* member sees no content yet (RLS
--     is the security boundary, CLAUDE.md rule #2 — never trust the client)
--   * SECURITY DEFINER RPCs for the privileged transitions the client drives:
--       validate_invite_code / join_with_invite_code / approve_member /
--       decline_member
--   * RLS for invite_codes + a tightened profiles INSERT policy
--
-- Append-only (rule #6): helper functions are re-declared with CREATE OR REPLACE
-- and the profiles INSERT policy is dropped + recreated here, never edited in 0008/0009.

-- ── membership status ───────────────────────────────────────────────────────
create type public.membership_status as enum ('pending', 'approved', 'declined');

-- Default 'approved' so every pre-existing (seed/test) profile keeps access; a
-- new member self-joining through the RPC is inserted as 'pending' explicitly,
-- and the INSERT policy below forbids an authenticated user self-approving.
alter table public.profiles
  add column status public.membership_status not null default 'approved';

create index profiles_status_idx on public.profiles (location_id, status);

-- ── invite_codes ────────────────────────────────────────────────────────────
-- Location leaders / coordinators mint codes; a joining member redeems one
-- (via join_with_invite_code) to bind their pending profile to that location.
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null,
  max_uses integer not null default 25,
  uses integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint invite_codes_max_uses_positive check (max_uses > 0),
  constraint invite_codes_uses_bounded check (uses >= 0 and uses <= max_uses),
  -- Codes are stored + compared in upper case; keep them human-typable.
  constraint invite_codes_code_format check (code = upper(code) and char_length(code) between 4 and 32)
);
-- One live code per string (a soft-deleted code may be re-minted).
create unique index invite_codes_code_key on public.invite_codes (code) where deleted_at is null;
create index invite_codes_location_id_idx on public.invite_codes (location_id);

create trigger set_updated_at before update on public.invite_codes
  for each row execute function public.set_updated_at();

-- ── status-gated read helpers (replace 0008) ────────────────────────────────
-- All content reads funnel through these (+ announcement_matches); adding the
-- approved check gates the whole feed/schedule/library/compliance surface
-- behind approval without touching every policy.
create or replace function public.my_region()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.region_id
  from public.profiles p
  join public.locations l on l.id = p.location_id
  where p.id = auth.uid() and p.status = 'approved';
$$;

create or replace function public.my_location()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.location_id from public.profiles p
  where p.id = auth.uid() and p.status = 'approved';
$$;

create or replace function public.my_voice_part()
returns public.voice_part
language sql
stable
security definer
set search_path = public
as $$
  select p.voice_part from public.profiles p
  where p.id = auth.uid() and p.status = 'approved';
$$;

-- Same body as 0008 but every inline profile lookup requires status='approved',
-- so a pending member matches no announcement audience.
create or replace function public.announcement_matches(ann_id uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.audiences a
    where a.announcement_id = ann_id
      and a.deleted_at is null
      and (
        a.target_type = 'all'
        or (
          a.target_type = 'region'
          and a.target_id = (
            select l.region_id from public.profiles p
            join public.locations l on l.id = p.location_id
            where p.id = uid and p.status = 'approved'
          )
        )
        or (
          a.target_type = 'location'
          and a.target_id = (
            select p.location_id from public.profiles p
            where p.id = uid and p.status = 'approved'
          )
        )
        or (
          a.target_type = 'voice_part'
          and exists (
            select 1 from public.groups g
            join public.profiles p on p.id = uid and p.status = 'approved'
            where g.id = a.target_id
              and g.voice_part = p.voice_part
              and g.location_id = p.location_id
          )
        )
        or (
          a.target_type = 'group'
          and exists (
            select 1 from public.group_members gm
            join public.profiles p on p.id = gm.profile_id and p.status = 'approved'
            where gm.group_id = a.target_id
              and gm.profile_id = uid
              and gm.deleted_at is null
          )
        )
      )
  );
$$;

-- ── onboarding RPCs (SECURITY DEFINER — privileged state transitions) ────────

-- Peek at a code without exposing the invite_codes table to joining members.
-- Raises a distinct message per failure reason so the client can show a
-- recoverable error alongside the "Call your location leader" fallback (§5).
create or replace function public.validate_invite_code(p_code text)
returns table (location_id uuid, location_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec public.invite_codes;
begin
  select * into rec from public.invite_codes
  where code = upper(btrim(coalesce(p_code, ''))) and deleted_at is null;

  if not found then
    raise exception 'INVITE_INVALID' using errcode = 'P0001';
  elsif rec.revoked_at is not null then
    raise exception 'INVITE_REVOKED' using errcode = 'P0001';
  elsif rec.expires_at <= now() then
    raise exception 'INVITE_EXPIRED' using errcode = 'P0001';
  elsif rec.uses >= rec.max_uses then
    raise exception 'INVITE_EXHAUSTED' using errcode = 'P0001';
  end if;

  return query
    select rec.location_id, l.name
    from public.locations l where l.id = rec.location_id;
end;
$$;

-- Redeem a code and create (or complete) the caller's pending profile. The
-- location is derived from the *code*, never from client input — the invite is
-- the sole authority for which location a member may join. Consumes one use,
-- exactly once per member, under a row lock so max_uses can't be over-run.
create or replace function public.join_with_invite_code(
  p_code text,
  p_display_name text,
  p_voice_part public.voice_part default null
)
returns table (profile_id uuid, location_id uuid, status public.membership_status)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rec public.invite_codes;
  v_uid uuid := auth.uid();
  v_existing public.membership_status;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) = 0 then
    raise exception 'NAME_REQUIRED' using errcode = 'P0001';
  end if;

  select * into rec from public.invite_codes
  where code = upper(btrim(coalesce(p_code, ''))) and deleted_at is null
  for update;

  if not found then
    raise exception 'INVITE_INVALID' using errcode = 'P0001';
  elsif rec.revoked_at is not null then
    raise exception 'INVITE_REVOKED' using errcode = 'P0001';
  elsif rec.expires_at <= now() then
    raise exception 'INVITE_EXPIRED' using errcode = 'P0001';
  elsif rec.uses >= rec.max_uses then
    raise exception 'INVITE_EXHAUSTED' using errcode = 'P0001';
  end if;

  select p.status into v_existing from public.profiles p where p.id = v_uid;

  insert into public.profiles (id, location_id, display_name, voice_part, status, phone)
  values (
    v_uid, rec.location_id, btrim(p_display_name), p_voice_part, 'pending',
    (select u.phone from auth.users u where u.id = v_uid)
  )
  on conflict (id) do update set
    location_id = excluded.location_id,
    display_name = excluded.display_name,
    voice_part = excluded.voice_part,
    -- Never demote an already-approved member back to pending on a re-submit.
    status = case when public.profiles.status = 'approved'
                  then public.profiles.status else 'pending' end;

  -- Consume a use only for a genuinely new member (not a pending re-submit),
  -- so one member correcting their name can't exhaust the code.
  if v_existing is null then
    update public.invite_codes set uses = uses + 1 where id = rec.id;
  end if;

  return query
    select v_uid, rec.location_id,
           (select p.status from public.profiles p where p.id = v_uid);
end;
$$;

-- Leader approves a pending member: flip to approved and grant the scoped member
-- role (§5 — approve joins: Location Leader / Regional Coordinator). Authority is
-- can_manage_member_compliance = the member's location leader or region coordinator.
create or replace function public.approve_member(p_profile_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_loc uuid;
begin
  if not public.can_manage_member_compliance(auth.uid(), p_profile_id) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  update public.profiles
    set status = 'approved'
    where id = p_profile_id and status <> 'approved'
    returning location_id into v_loc;

  if v_loc is not null then
    insert into public.roles (profile_id, role, scope_type, scope_id)
    values (p_profile_id, 'member', 'location', v_loc)
    on conflict (profile_id, role, scope_type, scope_id) do nothing;
  end if;
end;
$$;

-- Leader declines a pending member. Kept (not deleted) as an audit trail; the
-- member simply never gains access (status-gated helpers above).
create or replace function public.decline_member(p_profile_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.can_manage_member_compliance(auth.uid(), p_profile_id) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  update public.profiles set status = 'declined'
    where id = p_profile_id and status = 'pending';
end;
$$;

-- ── grants & RLS ────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.invite_codes to authenticated;
grant execute on function public.validate_invite_code(text) to authenticated;
grant execute on function public.join_with_invite_code(text, text, public.voice_part) to authenticated;
grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.decline_member(uuid) to authenticated;

alter table public.invite_codes enable row level security;

-- Only a leader with authority over the location (location leader or the
-- region's coordinator — can_target 'location') may read/manage its codes. A
-- joining member never selects this table directly; they go through the RPCs.
create policy invite_codes_select on public.invite_codes for select to authenticated
  using (public.can_target(auth.uid(), 'location', location_id));
create policy invite_codes_insert on public.invite_codes for insert to authenticated
  with check (public.can_target(auth.uid(), 'location', location_id) and created_by = auth.uid());
create policy invite_codes_update on public.invite_codes for update to authenticated
  using (public.can_target(auth.uid(), 'location', location_id))
  with check (public.can_target(auth.uid(), 'location', location_id));
create policy invite_codes_delete on public.invite_codes for delete to authenticated
  using (public.can_target(auth.uid(), 'location', location_id));

-- Tighten self-insert: an authenticated user may create only their own profile,
-- always pending, and may not choose a location (that is the invite's job). Real
-- location joins run through join_with_invite_code (SECURITY DEFINER, RLS-exempt).
drop policy profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and status = 'pending' and location_id is null);

-- ── realtime ────────────────────────────────────────────────────────────────
-- The pending-approval screen subscribes to its own profile row and routes into
-- the app when status flips to approved. Add profiles to the realtime publication
-- if present (idempotent; the publication does not exist in bare-Postgres tests).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
    ) then
      alter publication supabase_realtime add table public.profiles;
    end if;
  end if;
end $$;
