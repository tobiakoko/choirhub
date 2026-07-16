-- 0004_events_rsvps.sql
-- Rehearsal schedule with RSVP. Data model: §4. An event is visible to its
-- location (or region-wide when location_id is null).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  uniform_directive text,
  meeting_url text,
  recurrence_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index events_region_id_idx on public.events (region_id);
create index events_location_id_idx on public.events (location_id);
create index events_starts_at_idx on public.events (starts_at);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null,
  client_uuid uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (event_id, profile_id),
  unique (client_uuid)
);
create index rsvps_profile_id_idx on public.rsvps (profile_id);

create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.rsvps
  for each row execute function public.set_updated_at();
