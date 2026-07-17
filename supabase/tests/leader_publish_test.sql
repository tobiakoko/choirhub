-- pgTAP tests for the leader compose / publish surface (§5).
-- Run via `npm run test:rls` → `supabase test db`. Self-contained: seeds its own
-- fixtures as the superuser (RLS bypassed), then impersonates users through the
-- request.jwt.claims GUC that auth.uid() reads. One transaction, rolled back.
--
-- Complements rls_policies_test.sql (which proves audience scope containment) by
-- covering the leader UI's server contract:
--   1. postable_scopes() offers a location leader only their in-scope audiences,
--      with live approved-member counts (pending members excluded)
--   2. postable_scopes() offers a coordinator the region-wide roll-up ('all' +
--      region + every location)
--   3. a leader JWT publishing an OUT-OF-SCOPE audience is rejected server-side
--      (the core guarantee: the client offering is a mirror, RLS is the boundary)
--   4. Critical priority is gated to location leaders / coordinators (a committee
--      lead cannot forge an SMS-triggering broadcast)
--   5. remind_pending_members() authorizes the "remind pending only" action

create extension if not exists pgtap;

begin;
select plan(18);

-- ── Fixtures (superuser, RLS bypassed) ──────────────────────────────────────
insert into auth.users (id) values
  ('c0000000-0000-0000-0000-0000000000c0'),  -- coordinator
  ('c0000000-0000-0000-0000-0000000000d1'),  -- DC location leader
  ('c0000000-0000-0000-0000-0000000000ce'),  -- DC committee lead (Finance)
  ('c0000000-0000-0000-0000-0000000000d2'),  -- Dallas location leader
  ('c0000000-0000-0000-0000-0000000000a1'),  -- DC soprano (Finance member)
  ('c0000000-0000-0000-0000-0000000000a2'),  -- DC alto
  ('c0000000-0000-0000-0000-0000000000a3'),  -- DC soprano, PENDING
  ('c0000000-0000-0000-0000-0000000000a5');  -- Dallas soprano

insert into public.regions (id, name) values
  ('c1000000-0000-0000-0000-000000000001', 'Test Region');
insert into public.locations (id, region_id, name) values
  ('c2000000-0000-0000-0000-0000000000dc', 'c1000000-0000-0000-0000-000000000001', 'DC'),
  ('c2000000-0000-0000-0000-0000000000da', 'c1000000-0000-0000-0000-000000000001', 'Dallas');

insert into public.groups (id, location_id, type, name, voice_part) values
  ('c3000000-0000-0000-0000-0000000000fa', 'c2000000-0000-0000-0000-0000000000dc', 'voice_part', 'DC Sopranos', 'soprano'),
  ('c3000000-0000-0000-0000-0000000000fb', 'c2000000-0000-0000-0000-0000000000dc', 'committee', 'Finance', null);

insert into public.profiles (id, location_id, display_name, voice_part, status) values
  ('c0000000-0000-0000-0000-0000000000c0', 'c2000000-0000-0000-0000-0000000000dc', 'Coordinator',   null,      'approved'),
  ('c0000000-0000-0000-0000-0000000000d1', 'c2000000-0000-0000-0000-0000000000dc', 'DC Leader',      'tenor',   'approved'),
  ('c0000000-0000-0000-0000-0000000000ce', 'c2000000-0000-0000-0000-0000000000dc', 'DC Finance Lead',null,      'approved'),
  ('c0000000-0000-0000-0000-0000000000d2', 'c2000000-0000-0000-0000-0000000000da', 'Dallas Leader',  'soprano', 'approved'),
  ('c0000000-0000-0000-0000-0000000000a1', 'c2000000-0000-0000-0000-0000000000dc', 'DC Soprano',     'soprano', 'approved'),
  ('c0000000-0000-0000-0000-0000000000a2', 'c2000000-0000-0000-0000-0000000000dc', 'DC Alto',        'alto',    'approved'),
  ('c0000000-0000-0000-0000-0000000000a3', 'c2000000-0000-0000-0000-0000000000dc', 'DC Pending',     'soprano', 'pending'),
  ('c0000000-0000-0000-0000-0000000000a5', 'c2000000-0000-0000-0000-0000000000da', 'Dallas Soprano', 'soprano', 'approved');

insert into public.roles (profile_id, role, scope_type, scope_id) values
  ('c0000000-0000-0000-0000-0000000000c0', 'regional_coordinator', 'region',   'c1000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-0000000000d1', 'location_leader',      'location', 'c2000000-0000-0000-0000-0000000000dc'),
  ('c0000000-0000-0000-0000-0000000000ce', 'committee_lead',       'group',    'c3000000-0000-0000-0000-0000000000fb'),
  ('c0000000-0000-0000-0000-0000000000d2', 'location_leader',      'location', 'c2000000-0000-0000-0000-0000000000da');

-- Finance committee members (approved): the committee lead and one soprano.
insert into public.group_members (group_id, profile_id) values
  ('c3000000-0000-0000-0000-0000000000fb', 'c0000000-0000-0000-0000-0000000000ce'),
  ('c3000000-0000-0000-0000-0000000000fb', 'c0000000-0000-0000-0000-0000000000a1');

-- Region-wide payment campaign for the remind test (2 pending of 3).
insert into public.campaigns (id, region_id, created_by, type, title) values
  ('c4000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000c0', 'payment', 'Levy');
insert into public.campaign_status (campaign_id, profile_id, status) values
  ('c4000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a1', 'complete'),
  ('c4000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a2', 'pending'),
  ('c4000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a5', 'pending');

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

-- ── 1. postable_scopes offers a DC leader only their in-scope audiences ──────
select pg_temp.login('c0000000-0000-0000-0000-0000000000d1');  -- DC leader
select is(
  (select count(*) from public.postable_scopes() where target_type = 'all')::int, 0,
  'DC leader is offered no region-wide (all) scope'
);
select is(
  (select count(*) from public.postable_scopes() where target_type = 'region')::int, 0,
  'DC leader is offered no region scope'
);
select is(
  (select count(*) from public.postable_scopes() where target_type = 'location')::int, 1,
  'DC leader is offered exactly one location (their own)'
);
select is(
  (select member_count from public.postable_scopes()
     where target_type = 'location' and target_id = 'c2000000-0000-0000-0000-0000000000dc'),
  5,
  'DC location count is the 5 approved DC members (the pending one is excluded)'
);
select is(
  (select member_count from public.postable_scopes()
     where target_type = 'voice_part' and target_id = 'c3000000-0000-0000-0000-0000000000fa'),
  1,
  'DC Sopranos count is the single approved DC soprano'
);
select is(
  (select member_count from public.postable_scopes()
     where target_type = 'group' and target_id = 'c3000000-0000-0000-0000-0000000000fb'),
  2,
  'Finance committee count is its two approved members'
);

-- ── 2. postable_scopes offers a coordinator the region-wide roll-up ─────────
select pg_temp.login('c0000000-0000-0000-0000-0000000000c0');  -- coordinator
select is(
  (select count(*) from public.postable_scopes() where target_type = 'all')::int, 1,
  'coordinator is offered the region-wide (all) scope'
);
select is(
  (select member_count from public.postable_scopes() where target_type = 'all'),
  7,
  'Everyone count is the 7 approved members across both locations'
);
select is(
  (select count(*) from public.postable_scopes() where target_type = 'region')::int, 1,
  'coordinator is offered their one region'
);
select is(
  (select count(*) from public.postable_scopes() where target_type = 'location')::int, 2,
  'coordinator is offered both locations in the region'
);

-- ── 3. A leader publishing an out-of-scope audience is rejected server-side ──
select pg_temp.login('c0000000-0000-0000-0000-0000000000d1');  -- DC leader
select lives_ok(
  $$ insert into public.announcements (id, author_id, category, title, body)
     values ('cb000000-0000-0000-0000-0000000000ff', 'c0000000-0000-0000-0000-0000000000d1', 'logistics', 'DC notice', 'x') $$,
  'DC leader can author an announcement'
);
select lives_ok(
  $$ insert into public.audiences (announcement_id, target_type, target_id)
     values ('cb000000-0000-0000-0000-0000000000ff', 'location', 'c2000000-0000-0000-0000-0000000000dc') $$,
  'DC leader can publish to their own location'
);
select throws_ok(
  $$ insert into public.audiences (announcement_id, target_type, target_id)
     values ('cb000000-0000-0000-0000-0000000000ff', 'region', 'c1000000-0000-0000-0000-000000000001') $$,
  '42501', null,
  'DC leader publishing region-wide is rejected by the server'
);
select throws_ok(
  $$ insert into public.audiences (announcement_id, target_type, target_id)
     values ('cb000000-0000-0000-0000-0000000000ff', 'location', 'c2000000-0000-0000-0000-0000000000da') $$,
  '42501', null,
  'DC leader publishing to another location is rejected by the server'
);

-- ── 4. Critical priority is gated to location leaders / coordinators ────────
select pg_temp.login('c0000000-0000-0000-0000-0000000000ce');  -- committee lead
select throws_ok(
  $$ insert into public.announcements (author_id, category, priority, title, body)
     values ('c0000000-0000-0000-0000-0000000000ce', 'logistics', 'critical', 'nope', 'x') $$,
  '42501', null,
  'a committee lead cannot author a Critical announcement'
);
select pg_temp.login('c0000000-0000-0000-0000-0000000000d1');  -- DC leader
select lives_ok(
  $$ insert into public.announcements (author_id, category, priority, title, body)
     values ('c0000000-0000-0000-0000-0000000000d1', 'logistics', 'critical', 'Critical DC', 'x') $$,
  'a location leader can author a Critical announcement'
);

-- ── 5. remind_pending_members authorizes the "remind pending only" action ────
select pg_temp.login('c0000000-0000-0000-0000-0000000000c0');  -- coordinator (creator)
select is(
  public.remind_pending_members('c4000000-0000-0000-0000-000000000001'),
  2,
  'the campaign owner reminds exactly the two pending members'
);
select pg_temp.login('c0000000-0000-0000-0000-0000000000d2');  -- Dallas leader (no authority)
select throws_ok(
  $$ select public.remind_pending_members('c4000000-0000-0000-0000-000000000001') $$,
  '42501', 'NOT_AUTHORIZED',
  'a leader without authority over the campaign cannot remind its members'
);

select * from finish();
rollback;
