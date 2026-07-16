-- pgTAP tests for onboarding: invite codes + leader approval (§5).
-- Run via `npm run test:rls` → `supabase test db`. Self-contained: seeds its own
-- fixtures as the superuser (RLS bypassed), then impersonates users through the
-- request.jwt.claims GUC that auth.uid() reads. One transaction, rolled back.
--
-- Proves the onboarding security guarantees:
--   1. a location leader mints + reads a code for their own location
--   2. a leader of another location CANNOT mint or read that code
--   3. a joining member CANNOT list invite_codes directly
--   4. validate_invite_code resolves a valid code (case-insensitive) and raises a
--      distinct reason for invalid / expired / exhausted / revoked codes
--   5. join_with_invite_code binds a *pending* profile to the code's location and
--      consumes exactly one use (a re-submit does not consume another)
--   6. a pending member sees no content; approval reveals it
--   7. only a leader with authority over the member's location may approve/decline

create extension if not exists pgtap;

begin;
select plan(21);

-- ── Fixtures (superuser, RLS bypassed) ──────────────────────────────────────
insert into auth.users (id, phone) values
  ('a0000000-0000-0000-0000-0000000000c0', '+12025550001'),  -- coordinator
  ('a0000000-0000-0000-0000-0000000000d1', '+12025550002'),  -- DC leader
  ('a0000000-0000-0000-0000-0000000000d2', '+12145550003'),  -- Dallas leader
  ('a0000000-0000-0000-0000-0000000000e1', '+12025550004');  -- joining member (no profile)

insert into public.regions (id, name) values
  ('11110000-0000-0000-0000-000000000001', 'Test Region');
insert into public.locations (id, region_id, name) values
  ('22220000-0000-0000-0000-0000000000dc', '11110000-0000-0000-0000-000000000001', 'DC'),
  ('22220000-0000-0000-0000-0000000000da', '11110000-0000-0000-0000-000000000001', 'Dallas');

insert into public.profiles (id, location_id, display_name, status) values
  ('a0000000-0000-0000-0000-0000000000c0', '22220000-0000-0000-0000-0000000000dc', 'Coordinator', 'approved'),
  ('a0000000-0000-0000-0000-0000000000d1', '22220000-0000-0000-0000-0000000000dc', 'DC Leader',    'approved'),
  ('a0000000-0000-0000-0000-0000000000d2', '22220000-0000-0000-0000-0000000000da', 'Dallas Leader','approved');
insert into public.roles (profile_id, role, scope_type, scope_id) values
  ('a0000000-0000-0000-0000-0000000000c0', 'regional_coordinator', 'region',   '11110000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-0000000000d1', 'location_leader',      'location', '22220000-0000-0000-0000-0000000000dc'),
  ('a0000000-0000-0000-0000-0000000000d2', 'location_leader',      'location', '22220000-0000-0000-0000-0000000000da');

-- A DC-location announcement the joining member should only see once approved.
insert into public.announcements (id, author_id, category, title, body, publish_at) values
  ('bb000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-0000000000d1', 'logistics', 'DC only', 'x', now() - interval '1 hour');
insert into public.audiences (announcement_id, target_type, target_id) values
  ('bb000000-0000-0000-0000-000000000001', 'location', '22220000-0000-0000-0000-0000000000dc');

-- Codes covering every failure reason (minted as superuser for the read tests).
insert into public.invite_codes (code, location_id, created_by, expires_at, max_uses, uses) values
  ('DCJOIN01', '22220000-0000-0000-0000-0000000000dc', 'a0000000-0000-0000-0000-0000000000d1', now() + interval '7 days', 2, 0),
  ('EXPIRED1', '22220000-0000-0000-0000-0000000000dc', 'a0000000-0000-0000-0000-0000000000d1', now() - interval '1 day',  5, 0),
  ('FULLCODE', '22220000-0000-0000-0000-0000000000dc', 'a0000000-0000-0000-0000-0000000000d1', now() + interval '1 day',  3, 3);
insert into public.invite_codes (code, location_id, created_by, expires_at, max_uses, uses, revoked_at) values
  ('REVOKED1', '22220000-0000-0000-0000-0000000000dc', 'a0000000-0000-0000-0000-0000000000d1', now() + interval '1 day',  5, 0, now());

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

-- ── 1. Leader mints + reads a code for their own location ───────────────────
select pg_temp.login('a0000000-0000-0000-0000-0000000000d1');  -- DC leader
select lives_ok(
  $$ insert into public.invite_codes (code, location_id, created_by, expires_at, max_uses)
     values ('DCFRESH1', '22220000-0000-0000-0000-0000000000dc', 'a0000000-0000-0000-0000-0000000000d1', now() + interval '7 days', 10) $$,
  'DC leader can mint a code for their own location'
);
select ok(
  exists (select 1 from public.invite_codes where code = 'DCJOIN01'),
  'DC leader can read a DC code'
);

-- ── 2. A leader of another location cannot mint or read the DC code ─────────
select pg_temp.login('a0000000-0000-0000-0000-0000000000d2');  -- Dallas leader
select throws_ok(
  $$ insert into public.invite_codes (code, location_id, created_by, expires_at, max_uses)
     values ('HACKDC01', '22220000-0000-0000-0000-0000000000dc', 'a0000000-0000-0000-0000-0000000000d2', now() + interval '7 days', 5) $$,
  '42501', null,
  'Dallas leader cannot mint a DC code'
);
select is(
  (select count(*) from public.invite_codes)::int, 0,
  'Dallas leader cannot read DC codes'
);

-- ── 3. A joining member cannot list invite_codes ────────────────────────────
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1');  -- joining member
select is(
  (select count(*) from public.invite_codes)::int, 0,
  'joining member cannot list invite_codes'
);

-- ── 4. validate_invite_code — valid resolves, bad codes raise per reason ────
select is(
  (select location_id from public.validate_invite_code('dcjoin01')),
  '22220000-0000-0000-0000-0000000000dc'::uuid,
  'validate_invite_code resolves a valid code case-insensitively'
);
select throws_ok($$ select public.validate_invite_code('NOSUCH99') $$, 'P0001', 'INVITE_INVALID',
  'an unknown code raises INVITE_INVALID');
select throws_ok($$ select public.validate_invite_code('EXPIRED1') $$, 'P0001', 'INVITE_EXPIRED',
  'an expired code raises INVITE_EXPIRED');
select throws_ok($$ select public.validate_invite_code('FULLCODE') $$, 'P0001', 'INVITE_EXHAUSTED',
  'a maxed-out code raises INVITE_EXHAUSTED');
select throws_ok($$ select public.validate_invite_code('REVOKED1') $$, 'P0001', 'INVITE_REVOKED',
  'a revoked code raises INVITE_REVOKED');

-- ── 5. join_with_invite_code — pending profile, one use consumed ────────────
select is(
  (select status from public.join_with_invite_code('DCJOIN01', 'Esther', 'alto')),
  'pending'::public.membership_status,
  'join_with_invite_code returns a pending membership'
);
-- (still logged in as the joining member; read-back is via the security-definer
-- fn output above and the pending-visibility check below.)
select pg_temp.login('a0000000-0000-0000-0000-0000000000c0');  -- coordinator can read region profiles
select is(
  (select location_id from public.profiles where id = 'a0000000-0000-0000-0000-0000000000e1'),
  '22220000-0000-0000-0000-0000000000dc'::uuid,
  'joined member is bound to the code''s location'
);
select is(
  (select uses from public.invite_codes where code = 'DCJOIN01')::int, 1,
  'join consumes exactly one use'
);

-- ── 6. Pending member sees no content; a re-submit does not consume a use ───
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1');
select is(
  (select count(*) from public.announcements)::int, 0,
  'a pending member sees no announcements'
);
select lives_ok(
  $$ select public.join_with_invite_code('DCJOIN01', 'Esther Adeyemi', 'soprano') $$,
  'pending member can re-submit their profile'
);
select pg_temp.login('a0000000-0000-0000-0000-0000000000c0');
select is(
  (select uses from public.invite_codes where code = 'DCJOIN01')::int, 1,
  'a re-submit does not consume a second use'
);

-- ── 7. Approval authority ───────────────────────────────────────────────────
select pg_temp.login('a0000000-0000-0000-0000-0000000000d2');  -- Dallas leader
select throws_ok(
  $$ select public.approve_member('a0000000-0000-0000-0000-0000000000e1') $$,
  '42501', 'NOT_AUTHORIZED',
  'a leader of another location cannot approve the member'
);
select pg_temp.login('a0000000-0000-0000-0000-0000000000d1');  -- DC leader
select lives_ok(
  $$ select public.approve_member('a0000000-0000-0000-0000-0000000000e1') $$,
  'the member''s location leader can approve them'
);
select is(
  (select status from public.profiles where id = 'a0000000-0000-0000-0000-0000000000e1'),
  'approved'::public.membership_status,
  'approval flips the member to approved'
);
select is(
  (select count(*) from public.roles
     where profile_id = 'a0000000-0000-0000-0000-0000000000e1' and role = 'member')::int,
  1,
  'approval grants the scoped member role'
);
-- Now approved, the member finally sees the DC announcement.
select pg_temp.login('a0000000-0000-0000-0000-0000000000e1');
select is(
  (select count(*) from public.announcements)::int, 1,
  'an approved member sees the location announcement'
);

select * from finish();
rollback;
