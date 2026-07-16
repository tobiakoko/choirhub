-- 0003_announcements.sql
-- Broadcast announcements, their audience targeting rows, and the per-member
-- acknowledgment / read-receipt records. Data model: §4. Targeting drives the
-- read-side RLS in §5 (audiences matched against caller's region/location/
-- voice-part/group memberships).

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category public.announcement_category not null,
  priority public.announcement_priority not null default 'normal',
  pinned boolean not null default false,
  requires_ack boolean not null default false,
  title text not null,
  body text not null,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index announcements_author_id_idx on public.announcements (author_id);
create index announcements_publish_at_idx on public.announcements (publish_at);

-- One row per targeted scope. target_id is null only for 'all'; otherwise it
-- references a region / location / group (a 'voice_part' target references a
-- groups row of type 'voice_part').
create table public.audiences (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  target_type public.audience_target_type not null,
  target_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint audiences_target_id_matches_type
    check ((target_type = 'all') = (target_id is null))
);
create index audiences_announcement_id_idx on public.audiences (announcement_id);
create index audiences_target_idx on public.audiences (target_type, target_id);

-- Acknowledgment of a requires_ack announcement. client_uuid makes the outbox
-- push idempotent (§6.1).
create table public.acknowledgments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  client_uuid uuid not null,
  acknowledged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (announcement_id, profile_id),
  unique (client_uuid)
);
create index acknowledgments_profile_id_idx on public.acknowledgments (profile_id);

create table public.read_receipts (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  client_uuid uuid not null,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (announcement_id, profile_id),
  unique (client_uuid)
);
create index read_receipts_profile_id_idx on public.read_receipts (profile_id);

create trigger set_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.audiences
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.acknowledgments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.read_receipts
  for each row execute function public.set_updated_at();
