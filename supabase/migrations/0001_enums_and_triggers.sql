-- 0001_enums_and_triggers.sql
-- Enum types and the shared updated_at trigger used by every table.
-- Data model: docs/choirhub-system-design-v2.md §4.

-- Scoped roles (§5 permission matrix).
create type public.user_role as enum (
  'member',
  'committee_lead',
  'location_leader',
  'regional_coordinator'
);

-- Every role grant is scoped to a region, a location, or a group.
create type public.role_scope_type as enum ('region', 'location', 'group');

create type public.voice_part as enum ('soprano', 'alto', 'tenor', 'bass');

create type public.group_type as enum ('committee', 'sub_choir', 'voice_part');

-- Announcement category → semantic color mapping lives client-side (§4).
create type public.announcement_category as enum (
  'rehearsal',
  'payment',
  'uniform',
  'forms',
  'logistics',
  'devotional'
);

-- Critical priority triggers the SMS fallback (§5).
create type public.announcement_priority as enum ('normal', 'critical');

create type public.audience_target_type as enum (
  'all',
  'region',
  'location',
  'group',
  'voice_part'
);

create type public.rsvp_status as enum ('yes', 'no', 'maybe');

create type public.song_asset_type as enum (
  'lyrics',
  'solfa',
  'score_pdf',
  'part_audio'
);

create type public.campaign_type as enum ('payment', 'task');

create type public.campaign_state as enum ('pending', 'complete', 'exempt');

-- Keeps updated_at current for delta sync (§6.1). Attached BEFORE UPDATE on
-- every table in this schema.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
