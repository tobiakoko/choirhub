-- 0002_org_structure.sql
-- Organizational hierarchy (regions › locations › groups), member profiles and
-- their scoped role grants. Data model: docs/choirhub-system-design-v2.md §4.
-- Every table carries updated_at + deleted_at for delta sync (§6.1).

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index locations_region_id_idx on public.locations (region_id);

-- Committees, sub-choirs and voice-part groups. A voice_part group carries the
-- part it represents so audience matching can resolve it without a join table.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  type public.group_type not null,
  name text not null,
  voice_part public.voice_part,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- voice_part is present exactly when the group represents a voice part.
  constraint groups_voice_part_matches_type
    check ((type = 'voice_part') = (voice_part is not null))
);
create index groups_location_id_idx on public.groups (location_id);

-- Member profile, 1:1 with an auth.users row (phone OTP identity, §8).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  display_name text not null,
  phone text,
  voice_part public.voice_part,
  locale text not null default 'en',
  data_saver boolean not null default false,
  notif_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index profiles_location_id_idx on public.profiles (location_id);

-- Membership of committee / sub-choir groups (voice-part groups are matched via
-- profiles.voice_part, not membership rows).
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (group_id, profile_id)
);
create index group_members_profile_id_idx on public.group_members (profile_id);

-- Scoped role grants. scope_id references regions/locations/groups depending on
-- scope_type; every grant is scoped (§5 — "always scoped").
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  scope_type public.role_scope_type not null,
  scope_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (profile_id, role, scope_type, scope_id)
);
create index roles_profile_id_idx on public.roles (profile_id);
create index roles_scope_idx on public.roles (scope_type, scope_id);

create trigger set_updated_at before update on public.regions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.locations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.groups
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.group_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
