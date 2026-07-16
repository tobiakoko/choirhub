-- 0008_helper_functions.sql
-- Security helper functions used by the RLS policies in 0009. All are
-- SECURITY DEFINER so policy lookups (roles, memberships, audiences) bypass RLS
-- and cannot recurse; each pins search_path to public per Supabase guidance.
-- These are the "single enforcement point" plumbing referenced in §5/§8.

-- Region of the current caller, resolved through their profile's location.
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
  where p.id = auth.uid();
$$;

-- Location of the current caller.
create or replace function public.my_location()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.location_id from public.profiles p where p.id = auth.uid();
$$;

-- Voice part of the current caller.
create or replace function public.my_voice_part()
returns public.voice_part
language sql
stable
security definer
set search_path = public
as $$
  select p.voice_part from public.profiles p where p.id = auth.uid();
$$;

-- True when uid holds exactly this role at this scope.
create or replace function public.has_role(
  uid uuid,
  role public.user_role,
  scope_type public.role_scope_type,
  scope_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.roles r
    where r.profile_id = uid
      and r.role = has_role.role
      and r.scope_type = has_role.scope_type
      and r.scope_id = has_role.scope_id
      and r.deleted_at is null
  );
$$;

-- True when uid is authorized to broadcast to a single audience target. This is
-- the per-target write authority behind the §5 "post to own committee /
-- location / region-wide" matrix:
--   all         → regional_coordinator (any region they coordinate)
--   region      → regional_coordinator of that region
--   location    → location_leader of that location, or its coordinator
--   voice_part  → location_leader of the group's location, or its coordinator
--   group       → committee_lead of the group, its location_leader, or coordinator
create or replace function public.can_target(
  uid uuid,
  target_type public.audience_target_type,
  target_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_region uuid;
begin
  if target_type = 'all' then
    return exists (
      select 1 from public.roles r
      where r.profile_id = uid
        and r.role = 'regional_coordinator'
        and r.scope_type = 'region'
        and r.deleted_at is null
    );

  elsif target_type = 'region' then
    return exists (
      select 1 from public.roles r
      where r.profile_id = uid
        and r.role = 'regional_coordinator'
        and r.scope_type = 'region'
        and r.scope_id = target_id
        and r.deleted_at is null
    );

  elsif target_type = 'location' then
    select region_id into v_region from public.locations where id = target_id;
    return exists (
      select 1 from public.roles r
      where r.profile_id = uid
        and r.deleted_at is null
        and (
          (r.role = 'location_leader' and r.scope_type = 'location' and r.scope_id = target_id)
          or (r.role = 'regional_coordinator' and r.scope_type = 'region' and r.scope_id = v_region)
        )
    );

  elsif target_type = 'voice_part' then
    return exists (
      select 1
      from public.groups g
      join public.locations l on l.id = g.location_id
      join public.roles r on r.profile_id = uid and r.deleted_at is null
      where g.id = target_id
        and (
          (r.role = 'location_leader' and r.scope_type = 'location' and r.scope_id = g.location_id)
          or (r.role = 'regional_coordinator' and r.scope_type = 'region' and r.scope_id = l.region_id)
        )
    );

  elsif target_type = 'group' then
    return exists (
      select 1
      from public.groups g
      join public.locations l on l.id = g.location_id
      join public.roles r on r.profile_id = uid and r.deleted_at is null
      where g.id = target_id
        and (
          (r.role = 'committee_lead' and r.scope_type = 'group' and r.scope_id = g.id)
          or (r.role = 'location_leader' and r.scope_type = 'location' and r.scope_id = g.location_id)
          or (r.role = 'regional_coordinator' and r.scope_type = 'region' and r.scope_id = l.region_id)
        )
    );
  end if;

  return false;
end;
$$;

-- True when a published announcement targets uid: any of its audience rows
-- matches the caller's region / location / voice-part / group memberships (§5).
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
            where p.id = uid
          )
        )
        or (
          a.target_type = 'location'
          and a.target_id = (select p.location_id from public.profiles p where p.id = uid)
        )
        or (
          a.target_type = 'voice_part'
          and exists (
            select 1 from public.groups g
            join public.profiles p on p.id = uid
            where g.id = a.target_id
              and g.voice_part = p.voice_part
              and g.location_id = p.location_id
          )
        )
        or (
          a.target_type = 'group'
          and exists (
            select 1 from public.group_members gm
            where gm.group_id = a.target_id
              and gm.profile_id = uid
              and gm.deleted_at is null
          )
        )
      )
  );
$$;

-- True when uid is authorized to publish to *every* audience row of ann_id
-- (and the announcement has at least one audience). Used by the announcements
-- UPDATE policy to keep an edited announcement within the author's authority.
create or replace function public.author_can_target(uid uuid, ann_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.audiences
    where announcement_id = ann_id and deleted_at is null
  )
  and not exists (
    select 1 from public.audiences a
    where a.announcement_id = ann_id
      and a.deleted_at is null
      and not public.can_target(uid, a.target_type, a.target_id)
  );
$$;

-- True when uid holds any content-authoring (leader) role. Gates the
-- announcements INSERT so plain members can never author (§5).
create or replace function public.is_content_author(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.roles r
    where r.profile_id = uid
      and r.role in ('committee_lead', 'location_leader', 'regional_coordinator')
      and r.deleted_at is null
  );
$$;

-- True when uid manages content region-wide: a region coordinator, or any
-- location leader of a location in that region. Gates writes to the region-wide
-- song library and forms.
create or replace function public.manages_region(uid uuid, region uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.roles r
    left join public.locations l on l.id = r.scope_id and r.scope_type = 'location'
    where r.profile_id = uid
      and r.deleted_at is null
      and (
        (r.role = 'regional_coordinator' and r.scope_type = 'region' and r.scope_id = region)
        or (r.role = 'location_leader' and r.scope_type = 'location' and l.region_id = region)
      )
  );
$$;

-- True when uid may read/mark compliance for the given member: the member
-- themselves' location leader, or the region's coordinator. Backs the
-- campaign_status policies (§5 — self + location leader + coordinator).
create or replace function public.can_manage_member_compliance(uid uuid, member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.profile_id = uid and r.deleted_at is null
    where p.id = member
      and (
        (r.role = 'location_leader' and r.scope_type = 'location' and r.scope_id = p.location_id)
        or (
          r.role = 'regional_coordinator'
          and r.scope_type = 'region'
          and r.scope_id = (select l.region_id from public.locations l where l.id = p.location_id)
        )
      )
  );
$$;
