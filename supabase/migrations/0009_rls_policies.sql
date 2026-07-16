-- 0009_rls_policies.sql
-- Enable RLS on every table and implement the §5 permission matrix. RLS is the
-- single enforcement point (§8); the client is untrusted. Table privileges are
-- granted to the authenticated role and then narrowed by the policies below —
-- the standard Supabase pattern.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

alter table public.regions          enable row level security;
alter table public.locations        enable row level security;
alter table public.groups           enable row level security;
alter table public.group_members    enable row level security;
alter table public.profiles         enable row level security;
alter table public.roles            enable row level security;
alter table public.announcements    enable row level security;
alter table public.audiences        enable row level security;
alter table public.acknowledgments  enable row level security;
alter table public.read_receipts    enable row level security;
alter table public.events           enable row level security;
alter table public.rsvps            enable row level security;
alter table public.songs            enable row level security;
alter table public.song_assets      enable row level security;
alter table public.forms            enable row level security;
alter table public.form_responses   enable row level security;
alter table public.campaigns        enable row level security;
alter table public.campaign_status  enable row level security;

-- ── regions ────────────────────────────────────────────────────────────────
-- Everyone in a region can read it; only its coordinator writes.
create policy regions_select on public.regions for select to authenticated
  using (deleted_at is null and id = public.my_region());
create policy regions_write on public.regions for all to authenticated
  using (public.has_role(auth.uid(), 'regional_coordinator', 'region', id))
  with check (public.has_role(auth.uid(), 'regional_coordinator', 'region', id));

-- ── locations ──────────────────────────────────────────────────────────────
create policy locations_select on public.locations for select to authenticated
  using (deleted_at is null and region_id = public.my_region());
create policy locations_write on public.locations for all to authenticated
  using (public.has_role(auth.uid(), 'regional_coordinator', 'region', region_id))
  with check (public.has_role(auth.uid(), 'regional_coordinator', 'region', region_id));

-- ── groups ─────────────────────────────────────────────────────────────────
create policy groups_select on public.groups for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.locations l
      where l.id = groups.location_id and l.region_id = public.my_region()
    )
  );
create policy groups_write on public.groups for all to authenticated
  using (public.can_target(auth.uid(), 'location', location_id))
  with check (public.can_target(auth.uid(), 'location', location_id));

-- ── group_members ──────────────────────────────────────────────────────────
create policy group_members_select on public.group_members for select to authenticated
  using (
    deleted_at is null
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.groups g
        join public.locations l on l.id = g.location_id
        where g.id = group_members.group_id and l.region_id = public.my_region()
      )
    )
  );
create policy group_members_write on public.group_members for all to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and public.can_target(auth.uid(), 'location', g.location_id)
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and public.can_target(auth.uid(), 'location', g.location_id)
    )
  );

-- ── profiles ───────────────────────────────────────────────────────────────
-- Read your own profile and anyone in your region (directory). Edit only your own.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.locations l
      where l.id = profiles.location_id and l.region_id = public.my_region()
    )
  );
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── roles ──────────────────────────────────────────────────────────────────
-- Read your own grants; leaders/coordinators read grants in their scope. Only a
-- coordinator (region) or a location leader (own location, member grants) writes.
create policy roles_select on public.roles for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = roles.profile_id
        and public.can_manage_member_compliance(auth.uid(), p.id)
    )
  );
create policy roles_write on public.roles for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = roles.profile_id
        and public.can_manage_member_compliance(auth.uid(), p.id)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = roles.profile_id
        and public.can_manage_member_compliance(auth.uid(), p.id)
    )
  );

-- ── announcements ──────────────────────────────────────────────────────────
-- Read: your own, plus any published announcement whose audience matches you.
create policy announcements_select on public.announcements for select to authenticated
  using (
    deleted_at is null
    and (
      author_id = auth.uid()
      or (
        publish_at <= now()
        and (expires_at is null or expires_at > now())
        and public.announcement_matches(id, auth.uid())
      )
    )
  );
-- Insert: only leaders may author (members are blocked here); per-target
-- authority is enforced on the audiences rows below.
create policy announcements_insert on public.announcements for insert to authenticated
  with check (author_id = auth.uid() and public.is_content_author(auth.uid()));
-- Update/soft-delete: author only, and the edit must stay within their targeting
-- authority (author_can_target) once audiences exist.
create policy announcements_update on public.announcements for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      public.author_can_target(auth.uid(), id)
      or not exists (
        select 1 from public.audiences a
        where a.announcement_id = announcements.id and a.deleted_at is null
      )
    )
  );

-- ── audiences ──────────────────────────────────────────────────────────────
-- Read audiences of announcements you can see. Write only for your own
-- announcement and only to targets you are authorized to broadcast to — this is
-- where a DC location leader is stopped from posting region-wide.
create policy audiences_select on public.audiences for select to authenticated
  using (
    exists (
      select 1 from public.announcements an
      where an.id = audiences.announcement_id
        and an.deleted_at is null
        and (an.author_id = auth.uid() or public.announcement_matches(an.id, auth.uid()))
    )
  );
create policy audiences_write on public.audiences for all to authenticated
  using (
    exists (
      select 1 from public.announcements an
      where an.id = audiences.announcement_id and an.author_id = auth.uid()
    )
    and public.can_target(auth.uid(), target_type, target_id)
  )
  with check (
    exists (
      select 1 from public.announcements an
      where an.id = audiences.announcement_id and an.author_id = auth.uid()
    )
    and public.can_target(auth.uid(), target_type, target_id)
  );

-- ── acknowledgments ────────────────────────────────────────────────────────
-- Read your own; the author and region coordinators read the aggregate. Insert
-- your own, only for an announcement that targets you.
create policy acknowledgments_select on public.acknowledgments for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.announcements an
      where an.id = acknowledgments.announcement_id and an.author_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'regional_coordinator', 'region', public.my_region())
  );
create policy acknowledgments_insert on public.acknowledgments for insert to authenticated
  with check (
    profile_id = auth.uid()
    and public.announcement_matches(announcement_id, auth.uid())
  );
create policy acknowledgments_update on public.acknowledgments for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ── read_receipts ──────────────────────────────────────────────────────────
create policy read_receipts_select on public.read_receipts for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.announcements an
      where an.id = read_receipts.announcement_id and an.author_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'regional_coordinator', 'region', public.my_region())
  );
create policy read_receipts_insert on public.read_receipts for insert to authenticated
  with check (
    profile_id = auth.uid()
    and public.announcement_matches(announcement_id, auth.uid())
  );
create policy read_receipts_update on public.read_receipts for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ── events ─────────────────────────────────────────────────────────────────
create policy events_select on public.events for select to authenticated
  using (
    deleted_at is null
    and (
      author_id = auth.uid()
      or location_id = public.my_location()
      or (location_id is null and region_id = public.my_region())
    )
  );
create policy events_write on public.events for all to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      (location_id is null and public.can_target(auth.uid(), 'region', region_id))
      or (location_id is not null and public.can_target(auth.uid(), 'location', location_id))
    )
  );

-- ── rsvps ──────────────────────────────────────────────────────────────────
create policy rsvps_select on public.rsvps for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = rsvps.event_id and e.author_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'regional_coordinator', 'region', public.my_region())
  );
create policy rsvps_insert on public.rsvps for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = rsvps.event_id
        and e.deleted_at is null
        and (e.location_id = public.my_location() or (e.location_id is null and e.region_id = public.my_region()))
    )
  );
create policy rsvps_update on public.rsvps for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ── songs (region-wide repertoire) ─────────────────────────────────────────
create policy songs_select on public.songs for select to authenticated
  using (deleted_at is null and region_id = public.my_region());
create policy songs_write on public.songs for all to authenticated
  using (public.manages_region(auth.uid(), region_id))
  with check (public.manages_region(auth.uid(), region_id));

-- ── song_assets ────────────────────────────────────────────────────────────
create policy song_assets_select on public.song_assets for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.songs s
      where s.id = song_assets.song_id and s.deleted_at is null and s.region_id = public.my_region()
    )
  );
create policy song_assets_write on public.song_assets for all to authenticated
  using (
    exists (
      select 1 from public.songs s
      where s.id = song_assets.song_id and public.manages_region(auth.uid(), s.region_id)
    )
  )
  with check (
    exists (
      select 1 from public.songs s
      where s.id = song_assets.song_id and public.manages_region(auth.uid(), s.region_id)
    )
  );

-- ── forms ──────────────────────────────────────────────────────────────────
create policy forms_select on public.forms for select to authenticated
  using (
    deleted_at is null
    and (
      author_id = auth.uid()
      or location_id = public.my_location()
      or (location_id is null and region_id = public.my_region())
    )
  );
create policy forms_write on public.forms for all to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      (location_id is null and public.can_target(auth.uid(), 'region', region_id))
      or (location_id is not null and public.can_target(auth.uid(), 'location', location_id))
    )
  );

-- ── form_responses ─────────────────────────────────────────────────────────
create policy form_responses_select on public.form_responses for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.forms f
      where f.id = form_responses.form_id and f.author_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'regional_coordinator', 'region', public.my_region())
  );
create policy form_responses_insert on public.form_responses for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.forms f
      where f.id = form_responses.form_id
        and f.deleted_at is null
        and (f.location_id = public.my_location() or (f.location_id is null and f.region_id = public.my_region()))
    )
  );
create policy form_responses_update on public.form_responses for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ── campaigns ──────────────────────────────────────────────────────────────
-- Members see campaigns that apply to them; the creator, the member's location
-- leader and the region coordinator also see them.
create policy campaigns_select on public.campaigns for select to authenticated
  using (
    deleted_at is null
    and (
      created_by = auth.uid()
      or (location_id is null and group_id is null and region_id = public.my_region())
      or location_id = public.my_location()
      or (
        group_id is not null and exists (
          select 1 from public.group_members gm
          where gm.group_id = campaigns.group_id and gm.profile_id = auth.uid() and gm.deleted_at is null
        )
      )
      or public.has_role(auth.uid(), 'regional_coordinator', 'region', region_id)
    )
  );
create policy campaigns_write on public.campaigns for all to authenticated
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and (
      (location_id is null and group_id is null and public.can_target(auth.uid(), 'region', region_id))
      or (location_id is not null and public.can_target(auth.uid(), 'location', location_id))
      or (group_id is not null and public.can_target(auth.uid(), 'group', group_id))
    )
  );

-- ── campaign_status (compliance dashboard) ─────────────────────────────────
-- Read: the member themselves, their location leader, or the region coordinator
-- (the cross-location roll-up). A DC leader therefore cannot read Dallas rows.
create policy campaign_status_select on public.campaign_status for select to authenticated
  using (
    profile_id = auth.uid()
    or public.can_manage_member_compliance(auth.uid(), profile_id)
  );
-- Mark (insert/update): only a leader with authority over the member's location
-- (location leader / coordinator), or a committee lead for a group campaign, and
-- only stamping their own id as marked_by. Location leaders are thus confined to
-- their own location scope.
create policy campaign_status_insert on public.campaign_status for insert to authenticated
  with check (
    marked_by = auth.uid()
    and (
      public.can_manage_member_compliance(auth.uid(), profile_id)
      or exists (
        select 1 from public.campaigns c
        where c.id = campaign_status.campaign_id
          and c.group_id is not null
          and public.has_role(auth.uid(), 'committee_lead', 'group', c.group_id)
      )
    )
  );
create policy campaign_status_update on public.campaign_status for update to authenticated
  using (
    public.can_manage_member_compliance(auth.uid(), profile_id)
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_status.campaign_id
        and c.group_id is not null
        and public.has_role(auth.uid(), 'committee_lead', 'group', c.group_id)
    )
  )
  with check (
    marked_by = auth.uid()
    and (
      public.can_manage_member_compliance(auth.uid(), profile_id)
      or exists (
        select 1 from public.campaigns c
        where c.id = campaign_status.campaign_id
          and c.group_id is not null
          and public.has_role(auth.uid(), 'committee_lead', 'group', c.group_id)
      )
    )
  );
