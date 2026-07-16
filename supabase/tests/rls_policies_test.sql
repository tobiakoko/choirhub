-- pgTAP RLS policy tests (run via `npm run test:rls` → `supabase test db`).
-- Self-contained: seeds its own fixtures as the superuser (which bypasses RLS),
-- then switches to the `authenticated` role and impersonates specific users via
-- the request.jwt.claims GUC that auth.uid() reads. The whole file runs in one
-- transaction that is rolled back, so it never touches seeded data.
--
-- Proves the §5 permission matrix guarantees called out in the task:
--   1. a member CANNOT insert announcements
--   2. a member sees only announcements whose audience matches them
--   3. a coordinator sees the cross-location campaign_status roll-up
--   4. a DC location leader CANNOT read Dallas campaign_status
--   5. a DC location leader CANNOT post region-wide (but can target own location)
-- Read-only assertions run before the leader's write side-effects so the
-- visibility counts stay stable.

create extension if not exists pgtap;

begin;
select plan(11);

-- ── Fixtures (inserted as superuser, RLS bypassed) ──────────────────────────
insert into auth.users (id) values
  ('fa000000-0000-0000-0000-0000000000c0'),
  ('fa000000-0000-0000-0000-0000000000d1'),
  ('fa000000-0000-0000-0000-0000000000d2'),
  ('fa000000-0000-0000-0000-0000000000a1'),
  ('fa000000-0000-0000-0000-0000000000a2'),
  ('fa000000-0000-0000-0000-0000000000a5');

insert into public.regions (id, name) values
  ('f1000000-0000-0000-0000-000000000001', 'Test Region');

insert into public.locations (id, region_id, name) values
  ('f2000000-0000-0000-0000-0000000000dc', 'f1000000-0000-0000-0000-000000000001', 'DC'),
  ('f2000000-0000-0000-0000-0000000000da', 'f1000000-0000-0000-0000-000000000001', 'Dallas');

insert into public.groups (id, location_id, type, name, voice_part) values
  ('f3000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-0000000000dc', 'voice_part', 'DC Sopranos', 'soprano');

insert into public.profiles (id, location_id, display_name, voice_part) values
  ('fa000000-0000-0000-0000-0000000000c0', 'f2000000-0000-0000-0000-0000000000dc', 'Coordinator', null),
  ('fa000000-0000-0000-0000-0000000000d1', 'f2000000-0000-0000-0000-0000000000dc', 'DC Leader', 'tenor'),
  ('fa000000-0000-0000-0000-0000000000d2', 'f2000000-0000-0000-0000-0000000000da', 'Dallas Leader', 'soprano'),
  ('fa000000-0000-0000-0000-0000000000a1', 'f2000000-0000-0000-0000-0000000000dc', 'DC Soprano', 'soprano'),
  ('fa000000-0000-0000-0000-0000000000a2', 'f2000000-0000-0000-0000-0000000000dc', 'DC Alto', 'alto'),
  ('fa000000-0000-0000-0000-0000000000a5', 'f2000000-0000-0000-0000-0000000000da', 'Dallas Soprano', 'soprano');

insert into public.roles (profile_id, role, scope_type, scope_id) values
  ('fa000000-0000-0000-0000-0000000000c0', 'regional_coordinator', 'region',   'f1000000-0000-0000-0000-000000000001'),
  ('fa000000-0000-0000-0000-0000000000d1', 'location_leader',      'location', 'f2000000-0000-0000-0000-0000000000dc'),
  ('fa000000-0000-0000-0000-0000000000d2', 'location_leader',      'location', 'f2000000-0000-0000-0000-0000000000da'),
  ('fa000000-0000-0000-0000-0000000000a1', 'member', 'location', 'f2000000-0000-0000-0000-0000000000dc'),
  ('fa000000-0000-0000-0000-0000000000a2', 'member', 'location', 'f2000000-0000-0000-0000-0000000000dc'),
  ('fa000000-0000-0000-0000-0000000000a5', 'member', 'location', 'f2000000-0000-0000-0000-0000000000da');

-- Announcements a DC soprano should / should not see.
insert into public.announcements (id, author_id, category, title, body, publish_at) values
  ('fb000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-0000000000c0', 'rehearsal', 'Region-wide', 'x', now() - interval '1 hour'),
  ('fb000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-0000000000d1', 'logistics', 'DC only',    'x', now() - interval '1 hour'),
  ('fb000000-0000-0000-0000-000000000003', 'fa000000-0000-0000-0000-0000000000d2', 'logistics', 'Dallas only','x', now() - interval '1 hour'),
  ('fb000000-0000-0000-0000-000000000004', 'fa000000-0000-0000-0000-0000000000d1', 'rehearsal', 'DC sopranos','x', now() - interval '1 hour');
insert into public.audiences (announcement_id, target_type, target_id) values
  ('fb000000-0000-0000-0000-000000000001', 'region',     'f1000000-0000-0000-0000-000000000001'),
  ('fb000000-0000-0000-0000-000000000002', 'location',   'f2000000-0000-0000-0000-0000000000dc'),
  ('fb000000-0000-0000-0000-000000000003', 'location',   'f2000000-0000-0000-0000-0000000000da'),
  ('fb000000-0000-0000-0000-000000000004', 'voice_part', 'f3000000-0000-0000-0000-000000000001');

-- Region-wide payment campaign with three per-member statuses (2 DC, 1 Dallas).
insert into public.campaigns (id, region_id, created_by, type, title) values
  ('fc000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-0000000000c0', 'payment', 'Levy');
insert into public.campaign_status (campaign_id, profile_id, status) values
  ('fc000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-0000000000a1', 'complete'),
  ('fc000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-0000000000a2', 'pending'),
  ('fc000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-0000000000a5', 'pending');

-- Impersonation helper: switch to the authenticated role and set the JWT sub
-- that auth.uid() resolves. Local so it is scoped to this transaction.
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

-- ── 1. A member cannot insert announcements ─────────────────────────────────
select pg_temp.login('fa000000-0000-0000-0000-0000000000a1');  -- DC soprano member
select throws_ok(
  $$ insert into public.announcements (author_id, category, title, body)
     values ('fa000000-0000-0000-0000-0000000000a1', 'rehearsal', 'nope', 'nope') $$,
  '42501',
  null,
  'member cannot insert announcements'
);

-- ── 2. A member sees only announcements whose audience matches them ──────────
-- Still logged in as the DC soprano member.
select is(
  (select count(*) from public.announcements)::int,
  3,
  'DC soprano sees exactly their 3 matching announcements'
);
select is(
  (select count(*) from public.announcements
     where id = 'fb000000-0000-0000-0000-000000000003')::int,
  0,
  'DC soprano cannot see the Dallas-only announcement'
);
select ok(
  exists (select 1 from public.announcements where id = 'fb000000-0000-0000-0000-000000000004'),
  'DC soprano sees the DC-sopranos voice-part announcement'
);

-- ── 3. A coordinator sees the cross-location roll-up ────────────────────────
select pg_temp.login('fa000000-0000-0000-0000-0000000000c0');  -- coordinator
select is(
  (select count(*) from public.campaign_status)::int,
  3,
  'coordinator sees the full cross-location campaign_status roll-up'
);

-- ── 4. A DC location leader cannot read Dallas campaign_status ───────────────
select pg_temp.login('fa000000-0000-0000-0000-0000000000d1');  -- DC leader
select is(
  (select count(*) from public.campaign_status)::int,
  2,
  'DC leader sees only the two DC campaign_status rows'
);
select is(
  (select count(*) from public.campaign_status
     where profile_id = 'fa000000-0000-0000-0000-0000000000a5')::int,
  0,
  'DC leader cannot read Dallas campaign_status'
);

-- ── 5. DC leader write authority (side-effecting; run last) ──────────────────
-- Can author an announcement...
select lives_ok(
  $$ insert into public.announcements (id, author_id, category, title, body)
     values ('fb000000-0000-0000-0000-0000000000ff', 'fa000000-0000-0000-0000-0000000000d1', 'logistics', 'DC draft', 'x') $$,
  'DC leader can author an announcement'
);
-- ...and target their own location...
select lives_ok(
  $$ insert into public.audiences (announcement_id, target_type, target_id)
     values ('fb000000-0000-0000-0000-0000000000ff', 'location', 'f2000000-0000-0000-0000-0000000000dc') $$,
  'DC leader can target their own location'
);
-- ...but cannot broadcast region-wide...
select throws_ok(
  $$ insert into public.audiences (announcement_id, target_type, target_id)
     values ('fb000000-0000-0000-0000-0000000000ff', 'region', 'f1000000-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'DC leader cannot post region-wide'
);
-- ...nor to another location.
select throws_ok(
  $$ insert into public.audiences (announcement_id, target_type, target_id)
     values ('fb000000-0000-0000-0000-0000000000ff', 'location', 'f2000000-0000-0000-0000-0000000000da') $$,
  '42501',
  null,
  'DC leader cannot post to another location'
);

select * from finish();
rollback;
