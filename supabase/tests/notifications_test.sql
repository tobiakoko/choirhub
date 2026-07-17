-- pgTAP tests for the notification pipeline schema (§6.3 — migrations 0013–0015).
-- Run via `npm run test:rls` → `supabase test db`. Self-contained: seeds its own
-- fixtures as the superuser (RLS bypassed), then impersonates members through the
-- request.jwt.claims GUC that auth.uid() reads. One transaction, rolled back.
--
-- Covers the security boundary of the delivery jobs:
--   1. push_tokens RLS — a member reads only their own tokens
--   2. register_push_token — idempotent, ownership-reassigning
--   3. notification_prefs RLS — own row only
--   4. fanout_recipients — targets approved members only, excludes the author and
--      non-targeted members, flags muted categories, and is author/service-gated
--   5. digest_recipients — service-role only; folds due members' pending Normal posts
--   6. escalation_candidates / _recipients / record_escalation — service-role only,
--      resolve pending members, and latch each tier exactly once

create extension if not exists pgtap;

begin;
select plan(21);

-- ── Fixtures (superuser, RLS bypassed) ──────────────────────────────────────
insert into auth.users (id) values
  ('e0000000-0000-0000-0000-000000000001'),  -- author (DC location leader)
  ('e0000000-0000-0000-0000-000000000002'),  -- soprano A (targeted, mutes nothing)
  ('e0000000-0000-0000-0000-000000000003'),  -- alto B  (NOT targeted)
  ('e0000000-0000-0000-0000-000000000004'),  -- soprano C (targeted, mutes rehearsal)
  ('e0000000-0000-0000-0000-000000000005');  -- soprano D (pending — never a recipient)

insert into public.regions (id, name) values
  ('e1000000-0000-0000-0000-000000000001', 'Notif Region');
insert into public.locations (id, region_id, name) values
  ('e2000000-0000-0000-0000-0000000000dc', 'e1000000-0000-0000-0000-000000000001', 'DC');

insert into public.groups (id, location_id, type, name, voice_part) values
  ('e3000000-0000-0000-0000-0000000000fa', 'e2000000-0000-0000-0000-0000000000dc', 'voice_part', 'DC Sopranos', 'soprano');

insert into public.profiles (id, location_id, display_name, voice_part, status, phone) values
  ('e0000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-0000000000dc', 'DC Leader',   'tenor',   'approved', '+12025550001'),
  ('e0000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-0000000000dc', 'Soprano A',   'soprano', 'approved', '+12025550002'),
  ('e0000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-0000000000dc', 'Alto B',      'alto',    'approved', '+12025550003'),
  ('e0000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-0000000000dc', 'Soprano C',   'soprano', 'approved', '+12025550004'),
  ('e0000000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-0000000000dc', 'Soprano D',   'soprano', 'pending',  '+12025550005');

insert into public.roles (profile_id, role, scope_type, scope_id) values
  ('e0000000-0000-0000-0000-000000000001', 'location_leader', 'location', 'e2000000-0000-0000-0000-0000000000dc');

-- Live push tokens for the three approved non-author members.
insert into public.push_tokens (profile_id, token, platform) values
  ('e0000000-0000-0000-0000-000000000002', 'tok-A', 'android'),
  ('e0000000-0000-0000-0000-000000000003', 'tok-B', 'ios'),
  ('e0000000-0000-0000-0000-000000000004', 'tok-C', 'android');

-- Prefs: C mutes 'rehearsal'; A is due a digest this very hour, C is not.
insert into public.notification_prefs (profile_id, muted_categories, digest_hour, timezone) values
  ('e0000000-0000-0000-0000-000000000002', '{}',            extract(hour from (now() at time zone 'UTC'))::int,        'UTC'),
  ('e0000000-0000-0000-0000-000000000004', '{rehearsal}',   (extract(hour from (now() at time zone 'UTC'))::int + 12) % 24, 'UTC');

-- A Normal rehearsal announcement targeting DC Sopranos, published just now.
insert into public.announcements (id, author_id, category, priority, title, body, publish_at) values
  ('eb000000-0000-0000-0000-0000000000a1', 'e0000000-0000-0000-0000-000000000001', 'rehearsal', 'normal', 'Sectional', 'Sopranos only', now() - interval '1 minute');
insert into public.audiences (announcement_id, target_type, target_id) values
  ('eb000000-0000-0000-0000-0000000000a1', 'voice_part', 'e3000000-0000-0000-0000-0000000000fa');

-- A payment campaign with a deadline in 2 days: A + B pending, C complete.
insert into public.campaigns (id, region_id, created_by, type, title, deadline) values
  ('ec000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'payment', 'Levy', now() + interval '2 days');
insert into public.campaign_status (campaign_id, profile_id, status) values
  ('ec000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'pending'),
  ('ec000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'pending'),
  ('ec000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'complete');

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

-- Reset to the (service-role-equivalent) superuser context: no jwt claims → auth.uid() null.
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', null, true);
end;
$$;

-- ── 1. push_tokens RLS: a member reads only their own token ──────────────────
select pg_temp.login('e0000000-0000-0000-0000-000000000002');  -- soprano A
select is(
  (select count(*) from public.push_tokens)::int, 1,
  'a member sees exactly their own push token'
);
select is(
  (select token from public.push_tokens), 'tok-A',
  'and it is their own token'
);

-- ── 2. register_push_token: idempotent + ownership reassignment ──────────────
select lives_ok(
  $$ select public.register_push_token('tok-A2', 'android', 'device-A') $$,
  'a member can register a new push token'
);
select pg_temp.login('e0000000-0000-0000-0000-000000000003');  -- alto B
select lives_ok(
  $$ select public.register_push_token('tok-A', 'ios', 'device-B') $$,
  'registering an existing token reassigns it to the caller'
);
select pg_temp.logout();
select is(
  (select profile_id from public.push_tokens where token = 'tok-A' and deleted_at is null),
  'e0000000-0000-0000-0000-000000000003',
  'tok-A now belongs to alto B'
);

-- ── 3. notification_prefs RLS: own row only ─────────────────────────────────
select pg_temp.login('e0000000-0000-0000-0000-000000000004');  -- soprano C
select is(
  (select count(*) from public.notification_prefs)::int, 1,
  'a member sees only their own prefs row'
);
select is(
  (select muted_categories from public.notification_prefs)::text, '{rehearsal}',
  'and reads their own muted categories'
);

-- ── 4. fanout_recipients ─────────────────────────────────────────────────────
select pg_temp.login('e0000000-0000-0000-0000-000000000001');  -- author
select is(
  (select count(*) from public.fanout_recipients('eb000000-0000-0000-0000-0000000000a1'))::int, 2,
  'fan-out targets exactly the two approved sopranos (A + C)'
);
select is(
  (select count(*) from public.fanout_recipients('eb000000-0000-0000-0000-0000000000a1')
     where profile_id = 'e0000000-0000-0000-0000-000000000003')::int, 0,
  'the non-targeted alto is not a recipient'
);
select is(
  (select count(*) from public.fanout_recipients('eb000000-0000-0000-0000-0000000000a1')
     where profile_id = 'e0000000-0000-0000-0000-000000000001')::int, 0,
  'the author never notifies themselves'
);
select is(
  (select muted from public.fanout_recipients('eb000000-0000-0000-0000-0000000000a1')
     where profile_id = 'e0000000-0000-0000-0000-000000000004'),
  true,
  'soprano C (mutes rehearsal) is flagged muted'
);
select is(
  (select muted from public.fanout_recipients('eb000000-0000-0000-0000-0000000000a1')
     where profile_id = 'e0000000-0000-0000-0000-000000000002'),
  false,
  'soprano A is not muted'
);
select pg_temp.login('e0000000-0000-0000-0000-000000000003');  -- non-author
select throws_ok(
  $$ select * from public.fanout_recipients('eb000000-0000-0000-0000-0000000000a1') $$,
  '42501', null,
  'a non-author cannot resolve fan-out recipients'
);

-- ── 5. digest_recipients (service-role only) ─────────────────────────────────
select pg_temp.login('e0000000-0000-0000-0000-000000000002');
select throws_ok(
  $$ select * from public.digest_recipients() $$,
  '42501', null,
  'an authenticated member cannot run the digest resolver'
);
select pg_temp.logout();
select is(
  (select count(*) from public.digest_recipients())::int, 1,
  'exactly one member (soprano A) is due a digest this hour with pending items'
);
select is(
  (select profile_id from public.digest_recipients()),
  'e0000000-0000-0000-0000-000000000002',
  'and it is soprano A (C is muted + not due this hour)'
);
select is(
  (select jsonb_array_length(items) from public.digest_recipients()), 1,
  'A''s digest folds in the single pending Normal announcement'
);

-- ── 6. escalation resolvers (service-role only) + idempotent latch ───────────
select is(
  (select pending_count from public.escalation_candidates()
     where campaign_id = 'ec000000-0000-0000-0000-000000000001'),
  2,
  'the campaign shows its two pending members as escalation candidates'
);
select is(
  (select count(distinct profile_id) from public.escalation_recipients('ec000000-0000-0000-0000-000000000001'))::int, 2,
  'escalation resolves the two pending members with tokens'
);
select is(
  public.record_escalation('ec000000-0000-0000-0000-000000000001', 'T-24h'), true,
  'the first T-24h latch wins'
);
select is(
  public.record_escalation('ec000000-0000-0000-0000-000000000001', 'T-24h'), false,
  'a second T-24h latch is a no-op (tier fires at most once)'
);

select * from finish();
rollback;
