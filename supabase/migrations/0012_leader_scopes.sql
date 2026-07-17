-- 0012_leader_scopes.sql
-- Server-side plumbing for the leader UI (docs/choirhub-system-design-v2.md §5).
-- The compose sheet must only *offer* audiences the caller may target, so the UI
-- fetches them from postable_scopes() rather than guessing — and RLS remains the
-- sole enforcement point (§8, CLAUDE.md rule #2): the audiences write policy
-- already rejects any out-of-scope target, so postable_scopes is a convenience
-- mirror of that authority, never a replacement for it.
--
-- Adds:
--   * can_set_critical()          — who may raise an announcement to Critical (§5)
--   * announcements insert/update — recreated to gate Critical priority server-side
--   * postable_scopes()           — targetable audiences + live approved-member count
--   * remind_pending_members()    — authorized "remind pending only" action (§6.3)
-- Append-only (rule #6): policies are dropped + recreated here, never edited in 0009.

-- ── who may raise Critical priority (§5: location leader / coordinator only) ──
-- Committee leads can post to their committee but never at Critical (SMS fallback
-- is a location-wide escalation). Any-scope grant of the two leader roles suffices;
-- the per-audience authority is still enforced separately on the audiences rows.
create or replace function public.can_set_critical(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.roles r
    where r.profile_id = uid
      and r.role in ('location_leader', 'regional_coordinator')
      and r.deleted_at is null
  );
$$;

grant execute on function public.can_set_critical(uuid) to authenticated;

-- ── recreate announcements insert/update to gate Critical server-side ────────
-- Same bodies as 0009 plus the priority gate: a compromised committee-lead account
-- cannot forge a Critical (SMS-triggering) broadcast even if the client is patched.
drop policy announcements_insert on public.announcements;
create policy announcements_insert on public.announcements for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_content_author(auth.uid())
    and (priority <> 'critical' or public.can_set_critical(auth.uid()))
  );

drop policy announcements_update on public.announcements;
create policy announcements_update on public.announcements for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (priority <> 'critical' or public.can_set_critical(auth.uid()))
    and (
      public.author_can_target(auth.uid(), id)
      or not exists (
        select 1 from public.audiences a
        where a.announcement_id = announcements.id and a.deleted_at is null
      )
    )
  );

-- ── postable_scopes(): audiences the caller may target + live member counts ───
-- Returns one row per targetable audience for the compose Audience step. Every
-- row satisfies can_target(auth.uid(), target_type, target_id) by construction,
-- so the UI can only ever offer in-scope options; member_count is the live count
-- of *approved* members the broadcast would reach. SECURITY DEFINER so it can read
-- roles/profiles regardless of the caller's own row-level grants.
create or replace function public.postable_scopes()
returns table (
  target_type public.audience_target_type,
  target_id uuid,
  label text,
  member_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with uid as (select auth.uid() as id),
  -- Regions the caller coordinates region-wide.
  coordinated_regions as (
    select r.scope_id as region_id
    from public.roles r, uid
    where r.profile_id = uid.id
      and r.role = 'regional_coordinator'
      and r.scope_type = 'region'
      and r.deleted_at is null
  ),
  -- Locations the caller leads directly, plus every location in a coordinated
  -- region (a coordinator manages all of them).
  managed_locations as (
    select l.id as location_id
    from public.locations l
    where l.deleted_at is null
      and (
        exists (
          select 1 from public.roles r, uid
          where r.profile_id = uid.id
            and r.role = 'location_leader'
            and r.scope_type = 'location'
            and r.scope_id = l.id
            and r.deleted_at is null
        )
        or l.region_id in (select region_id from coordinated_regions)
      )
  ),
  -- Committees / sub-choirs: led directly, or inside a managed location.
  managed_groups as (
    select g.id as group_id
    from public.groups g
    where g.deleted_at is null
      and g.type in ('committee', 'sub_choir')
      and (
        g.location_id in (select location_id from managed_locations)
        or exists (
          select 1 from public.roles r, uid
          where r.profile_id = uid.id
            and r.role = 'committee_lead'
            and r.scope_type = 'group'
            and r.scope_id = g.id
            and r.deleted_at is null
        )
      )
  )
  -- 'all' — one row, only for a coordinator; reaches everyone they coordinate.
  select 'all'::public.audience_target_type, null::uuid, 'Everyone'::text,
         (
           select count(*)::int
           from public.profiles p
           join public.locations l on l.id = p.location_id
           where l.region_id in (select region_id from coordinated_regions)
             and p.status = 'approved'
         )
  where exists (select 1 from coordinated_regions)

  union all
  -- 'region' — each coordinated region.
  select 'region', cr.region_id,
         (select rg.name from public.regions rg where rg.id = cr.region_id),
         (
           select count(*)::int from public.profiles p
           join public.locations l on l.id = p.location_id
           where l.region_id = cr.region_id and p.status = 'approved'
         )
  from coordinated_regions cr

  union all
  -- 'location' — each managed location.
  select 'location', ml.location_id,
         (select l.name from public.locations l where l.id = ml.location_id),
         (
           select count(*)::int from public.profiles p
           where p.location_id = ml.location_id and p.status = 'approved'
         )
  from managed_locations ml

  union all
  -- 'voice_part' — every voice-part group in a managed location.
  select 'voice_part', g.id, g.name,
         (
           select count(*)::int from public.profiles p
           where p.location_id = g.location_id
             and p.voice_part = g.voice_part
             and p.status = 'approved'
         )
  from public.groups g
  where g.deleted_at is null
    and g.type = 'voice_part'
    and g.location_id in (select location_id from managed_locations)

  union all
  -- 'group' — managed committees / sub-choirs.
  select 'group', mg.group_id,
         (select g.name from public.groups g where g.id = mg.group_id),
         (
           select count(*)::int from public.group_members gm
           join public.profiles p on p.id = gm.profile_id
           where gm.group_id = mg.group_id
             and gm.deleted_at is null
             and p.status = 'approved'
         )
  from managed_groups mg;
$$;

grant execute on function public.postable_scopes() to authenticated;

-- ── remind_pending_members(): the "remind pending only" action (§6.3) ─────────
-- Re-notifies only members still pending on a campaign — the automation that
-- replaces manual WhatsApp chasing. This RPC authorizes the request (the campaign
-- must be one the caller manages) and returns how many members it targets; the
-- actual push/SMS is emitted by the notification pipeline (pg_cron / edge, §6.3).
-- Authority mirrors campaign_status write: the campaign creator, a leader with
-- authority over the members' location, or the committee lead of a group campaign.
create or replace function public.remind_pending_members(p_campaign_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c public.campaigns;
  v_authorized boolean;
  v_count integer;
begin
  select * into c from public.campaigns
  where id = p_campaign_id and deleted_at is null;
  if not found then
    raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_authorized := c.created_by = v_uid
    or (c.location_id is null and c.group_id is null
        and public.can_target(v_uid, 'region', c.region_id))
    or (c.location_id is not null and public.can_target(v_uid, 'location', c.location_id))
    or (c.group_id is not null and public.can_target(v_uid, 'group', c.group_id));

  if not v_authorized then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select count(*)::int into v_count
  from public.campaign_status s
  where s.campaign_id = p_campaign_id
    and s.status = 'pending'
    and s.deleted_at is null;

  return v_count;
end;
$$;

grant execute on function public.remind_pending_members(uuid) to authenticated;
