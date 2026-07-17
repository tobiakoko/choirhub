-- 0013_push_tokens.sql
-- Device push-token registry for the notification pipeline (§6.3). Every approved
-- member registers one Expo push token per device on launch; the fan-out / digest /
-- escalation jobs (0015) resolve a recipient's live tokens through here.
--
-- RLS (rule #2): a member reads and revokes only their own tokens. Registration is
-- the one privileged transition — a device that changes hands must be able to
-- re-point an existing token row to the new owner, which a self-scoped UPDATE
-- policy could not do — so it goes through register_push_token (SECURITY DEFINER),
-- mirroring the invite-code onboarding pattern (0010). No service-role key ever
-- reaches app code.

create type public.push_platform as enum ('ios', 'android', 'web');

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform public.push_platform not null,
  -- Stable per-install id (expo-application) so a re-registration replaces the
  -- device's prior row rather than accumulating stale tokens.
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- One live row per Expo token (a soft-deleted token may be re-registered).
create unique index push_tokens_token_key on public.push_tokens (token) where deleted_at is null;
create index push_tokens_profile_id_idx on public.push_tokens (profile_id) where deleted_at is null;

create trigger set_updated_at before update on public.push_tokens
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.push_tokens to authenticated;
alter table public.push_tokens enable row level security;

-- Read/revoke your own tokens only. Direct writes are unnecessary for the client
-- (registration goes through the RPC), but a self-scoped delete lets a member sign
-- out and drop their token without an RPC round-trip.
create policy push_tokens_select on public.push_tokens for select to authenticated
  using (profile_id = auth.uid());
create policy push_tokens_delete on public.push_tokens for delete to authenticated
  using (profile_id = auth.uid());

-- ── register_push_token: idempotent, ownership-reassigning upsert ─────────────
-- Binds an Expo token to the caller. If the token already exists (same device
-- re-registering, or a device that changed hands), it is re-pointed to the caller
-- and un-deleted; otherwise a fresh row is inserted. SECURITY DEFINER so it can
-- reassign a row a *previous* owner holds — the caller can only ever bind the token
-- to themselves (profile_id = auth.uid()), never read anyone else's.
create or replace function public.register_push_token(
  p_token text,
  p_platform public.push_platform,
  p_device_id text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if p_token is null or char_length(btrim(p_token)) = 0 then
    raise exception 'TOKEN_REQUIRED' using errcode = 'P0001';
  end if;

  -- Retire any other live row for this device owned by the caller (token rotated
  -- on the same install) so a device maps to exactly one live token.
  if p_device_id is not null then
    update public.push_tokens
      set deleted_at = now()
      where profile_id = v_uid and device_id = p_device_id
        and token <> btrim(p_token) and deleted_at is null;
  end if;

  insert into public.push_tokens (profile_id, token, platform, device_id)
  values (v_uid, btrim(p_token), p_platform, p_device_id)
  on conflict (token) where (deleted_at is null) do update
    set profile_id = v_uid,
        platform = excluded.platform,
        device_id = coalesce(excluded.device_id, public.push_tokens.device_id),
        deleted_at = null;
end;
$$;

grant execute on function public.register_push_token(text, public.push_platform, text) to authenticated;

-- Revoke a token (sign-out / notifications disabled). Only the owner's live row is
-- affected; a no-op if the token is unknown or owned by someone else.
create or replace function public.deactivate_push_token(p_token text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.push_tokens
    set deleted_at = now()
    where token = btrim(p_token) and profile_id = auth.uid() and deleted_at is null;
$$;

grant execute on function public.deactivate_push_token(text) to authenticated;
