-- Seed data for local development (applied by `npx supabase db reset`).
-- Mirrors the demo scenario in docs/choirhub-system-design-v2.md: one region,
-- two locations (DC, Dallas), a regional coordinator, a location leader per
-- location, and eight members spread across the four voice parts. All ids are
-- fixed so tests and manual QA can reference them.

-- Identities (phone-OTP users, §8). Real Supabase provisions auth.users via
-- GoTrue; here we insert the rows the profiles reference.
insert into auth.users (id, instance_id, aud, role, phone) values
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12025550100'), -- coordinator
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12025550101'), -- DC leader
  ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12145550102'), -- Dallas leader
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12025550111'), -- DC soprano
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12025550112'), -- DC alto
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12025550113'), -- DC tenor
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12025550114'), -- DC bass
  ('a2000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12145550115'), -- Dallas soprano
  ('a2000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12145550116'), -- Dallas alto
  ('a2000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12145550117'), -- Dallas tenor
  ('a2000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '+12145550118'); -- Dallas bass

-- Region + locations
insert into public.regions (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'DLBC Mid-Atlantic Region');

insert into public.locations (id, region_id, name) values
  ('20000000-0000-0000-0000-0000000000dc', '10000000-0000-0000-0000-000000000001', 'Washington DC'),
  ('20000000-0000-0000-0000-0000000000da', '10000000-0000-0000-0000-000000000001', 'Dallas');

-- Voice-part groups (one set per location) + a DC committee.
insert into public.groups (id, location_id, type, name, voice_part) values
  ('31000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000dc', 'voice_part', 'DC Sopranos', 'soprano'),
  ('31000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000dc', 'voice_part', 'DC Altos', 'alto'),
  ('31000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-0000000000dc', 'voice_part', 'DC Tenors', 'tenor'),
  ('31000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-0000000000dc', 'voice_part', 'DC Basses', 'bass'),
  ('32000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000da', 'voice_part', 'Dallas Sopranos', 'soprano'),
  ('32000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000da', 'voice_part', 'Dallas Altos', 'alto'),
  ('32000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-0000000000da', 'voice_part', 'Dallas Tenors', 'tenor'),
  ('32000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-0000000000da', 'voice_part', 'Dallas Basses', 'bass'),
  ('33000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000dc', 'committee', 'DC Welfare Committee', null);

-- Profiles. The coordinator has a home location (DC) so my_region() resolves.
insert into public.profiles (id, location_id, display_name, phone, voice_part) values
  ('c0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000dc', 'Grace Coordinator', '+12025550100', null),
  ('d1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000dc', 'David DC Leader', '+12025550101', 'tenor'),
  ('d2000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000da', 'Dorcas Dallas Leader', '+12145550102', 'soprano'),
  ('a1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000dc', 'Abigail (DC)', '+12025550111', 'soprano'),
  ('a1000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000dc', 'Anna (DC)', '+12025550112', 'alto'),
  ('a1000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-0000000000dc', 'Amos (DC)', '+12025550113', 'tenor'),
  ('a1000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-0000000000dc', 'Asa (DC)', '+12025550114', 'bass'),
  ('a2000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-0000000000da', 'Sarah (Dallas)', '+12145550115', 'soprano'),
  ('a2000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-0000000000da', 'Sade (Dallas)', '+12145550116', 'alto'),
  ('a2000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-0000000000da', 'Titus (Dallas)', '+12145550117', 'tenor'),
  ('a2000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-0000000000da', 'Boaz (Dallas)', '+12145550118', 'bass');

-- Committee membership (two DC members in the Welfare Committee).
insert into public.group_members (group_id, profile_id) values
  ('33000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');

-- Scoped role grants (§5). Members hold a member grant at their location; the
-- DC soprano additionally leads the Welfare Committee.
insert into public.roles (profile_id, role, scope_type, scope_id) values
  ('c0000000-0000-0000-0000-000000000001', 'regional_coordinator', 'region',   '10000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000001', 'location_leader',      'location', '20000000-0000-0000-0000-0000000000dc'),
  ('d2000000-0000-0000-0000-000000000001', 'location_leader',      'location', '20000000-0000-0000-0000-0000000000da'),
  ('a1000000-0000-0000-0000-000000000001', 'committee_lead',       'group',    '33000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000001', 'member', 'location', '20000000-0000-0000-0000-0000000000dc'),
  ('a1000000-0000-0000-0000-000000000002', 'member', 'location', '20000000-0000-0000-0000-0000000000dc'),
  ('a1000000-0000-0000-0000-000000000003', 'member', 'location', '20000000-0000-0000-0000-0000000000dc'),
  ('a1000000-0000-0000-0000-000000000004', 'member', 'location', '20000000-0000-0000-0000-0000000000dc'),
  ('a2000000-0000-0000-0000-000000000005', 'member', 'location', '20000000-0000-0000-0000-0000000000da'),
  ('a2000000-0000-0000-0000-000000000006', 'member', 'location', '20000000-0000-0000-0000-0000000000da'),
  ('a2000000-0000-0000-0000-000000000007', 'member', 'location', '20000000-0000-0000-0000-0000000000da'),
  ('a2000000-0000-0000-0000-000000000008', 'member', 'location', '20000000-0000-0000-0000-0000000000da');

-- Announcements + their audiences.
insert into public.announcements (id, author_id, category, priority, pinned, requires_ack, title, body, publish_at) values
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'rehearsal', 'normal', true,  true,
     'Regional convention rehearsals begin', 'All choristers: convention prep starts this Saturday. Please acknowledge.', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'logistics', 'normal', false, false,
     'DC bus pickup points', 'Washington DC pickup at 6:30am sharp from the church car park.', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000001', 'logistics', 'normal', false, false,
     'Dallas carpool sign-up', 'Dallas members, add your name to the carpool sheet by Friday.', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'rehearsal', 'critical', false, true,
     'DC sopranos sectional', 'Extra sectional for DC sopranos, Thursday 7pm. Please acknowledge.', now() - interval '6 hours');

insert into public.audiences (announcement_id, target_type, target_id) values
  ('a0000000-0000-0000-0000-000000000001', 'region',     '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'location',   '20000000-0000-0000-0000-0000000000dc'),
  ('a0000000-0000-0000-0000-000000000003', 'location',   '20000000-0000-0000-0000-0000000000da'),
  ('a0000000-0000-0000-0000-000000000004', 'voice_part', '31000000-0000-0000-0000-000000000001');

-- A sample acknowledgment (DC soprano acknowledged the regional rehearsal).
insert into public.acknowledgments (announcement_id, profile_id, client_uuid) values
  ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', gen_random_uuid());

-- Events: a region-wide rehearsal and a DC-only logistics meeting.
insert into public.events (id, region_id, location_id, author_id, title, description, starts_at, uniform_directive, recurrence_rule) values
  ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null,
     'c0000000-0000-0000-0000-000000000001', 'Regional mass rehearsal', 'Full-region rehearsal ahead of convention.',
     now() + interval '3 days', 'Formal: white top, black skirt/trousers', 'FREQ=WEEKLY;BYDAY=SA'),
  ('e0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000dc',
     'd1000000-0000-0000-0000-000000000001', 'DC logistics huddle', 'Coordinate DC transport and uniforms.',
     now() + interval '2 days', null, null);

insert into public.rsvps (event_id, profile_id, status, client_uuid) values
  ('e0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'yes', gen_random_uuid()),
  ('e0000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'maybe', gen_random_uuid());

-- A song with lyrics, solfa and a soprano part-audio asset.
insert into public.songs (id, region_id, title, composer, song_key, tempo, tags) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Great Is Thy Faithfulness', 'W. M. Runyan', 'D', 72, '{hymn,convention}');

-- part_audio renditions carry the object form `{url, bytes, durationSec}` per
-- rendition key so the app can state each download's size explicitly (§6.2). The
-- client caches Opus on cellular / AAC on Wi-Fi and never evicts the text below.
insert into public.song_assets (song_id, asset_type, voice_part, content, storage_path, renditions) values
  ('50000000-0000-0000-0000-000000000001', 'lyrics', null, 'Great is thy faithfulness, O God my Father...', null, '{}'::jsonb),
  ('50000000-0000-0000-0000-000000000001', 'solfa',  null, 'd  r  m  f | s  f  m  r | d  -  -  -', null, '{}'::jsonb),
  ('50000000-0000-0000-0000-000000000001', 'part_audio', 'soprano', null, 'songs/50000000/soprano.opus',
     '{"opus_24k":{"url":"https://cdn.example.org/songs/50000000/soprano.opus","bytes":735000,"durationSec":245},"aac_96k":{"url":"https://cdn.example.org/songs/50000000/soprano.m4a","bytes":2940000,"durationSec":245}}'::jsonb),
  ('50000000-0000-0000-0000-000000000001', 'part_audio', 'alto', null, 'songs/50000000/alto.opus',
     '{"opus_24k":{"url":"https://cdn.example.org/songs/50000000/alto.opus","bytes":735000,"durationSec":245},"aac_96k":{"url":"https://cdn.example.org/songs/50000000/alto.m4a","bytes":2940000,"durationSec":245}}'::jsonb),
  ('50000000-0000-0000-0000-000000000001', 'part_audio', 'tenor', null, 'songs/50000000/tenor.opus',
     '{"opus_24k":{"url":"https://cdn.example.org/songs/50000000/tenor.opus","bytes":735000,"durationSec":245},"aac_96k":{"url":"https://cdn.example.org/songs/50000000/tenor.m4a","bytes":2940000,"durationSec":245}}'::jsonb),
  ('50000000-0000-0000-0000-000000000001', 'part_audio', 'bass', null, 'songs/50000000/bass.opus',
     '{"opus_24k":{"url":"https://cdn.example.org/songs/50000000/bass.opus","bytes":735000,"durationSec":245},"aac_96k":{"url":"https://cdn.example.org/songs/50000000/bass.m4a","bytes":2940000,"durationSec":245}}'::jsonb);

-- A region-wide payment campaign with per-member status (the compliance board).
insert into public.campaigns (id, region_id, location_id, group_id, created_by, type, title, amount_cents, deadline) values
  ('c1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, null,
     'c0000000-0000-0000-0000-000000000001', 'payment', 'August uniform levy', 5000, now() + interval '20 days');

insert into public.campaign_status (campaign_id, profile_id, status, marked_by, client_uuid) values
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'complete', 'd1000000-0000-0000-0000-000000000001', gen_random_uuid()),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'pending',  null, gen_random_uuid()),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'pending',  null, gen_random_uuid()),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'exempt',   'd1000000-0000-0000-0000-000000000001', gen_random_uuid()),
  ('c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000005', 'complete', 'd2000000-0000-0000-0000-000000000001', gen_random_uuid()),
  ('c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000006', 'pending',  null, gen_random_uuid()),
  ('c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000007', 'pending',  null, gen_random_uuid()),
  ('c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000008', 'pending',  null, gen_random_uuid());

-- Onboarding invite codes (§5). One live code per location for manual QA, plus a
-- pre-expired DC code to exercise the recoverable "wrong code" error path. Codes
-- are stored upper-case; the app upper-cases what the member types.
insert into public.invite_codes (code, location_id, created_by, expires_at, max_uses, uses) values
  ('DCWELCOME',  '20000000-0000-0000-0000-0000000000dc', 'd1000000-0000-0000-0000-000000000001', now() + interval '30 days', 50, 0),
  ('DALLAS2026', '20000000-0000-0000-0000-0000000000da', 'd2000000-0000-0000-0000-000000000001', now() + interval '30 days', 50, 0),
  ('DCEXPIRED',  '20000000-0000-0000-0000-0000000000dc', 'd1000000-0000-0000-0000-000000000001', now() - interval '1 day',  50, 0);
