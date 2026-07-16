-- 0007_campaigns.sql
-- Payment / task compliance campaigns and per-member status. Data model: §4.
-- A campaign is scoped to exactly one of: the region (location_id and group_id
-- both null), a location, or a committee group. campaign_status is the
-- compliance dashboard's backing table — its RLS (§5) is the tightest in the
-- schema: readable by self + the member's location leader + coordinator; a
-- leader may mark status only within their own location scope.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  type public.campaign_type not null,
  title text not null,
  amount_cents integer,
  deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- A campaign has a single scope: region-wide, one location, or one group.
  constraint campaigns_single_scope
    check (location_id is null or group_id is null)
);
create index campaigns_region_id_idx on public.campaigns (region_id);
create index campaigns_location_id_idx on public.campaigns (location_id);
create index campaigns_group_id_idx on public.campaigns (group_id);

create table public.campaign_status (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.campaign_state not null default 'pending',
  marked_by uuid references public.profiles (id) on delete set null,
  client_uuid uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (campaign_id, profile_id),
  unique (client_uuid)
);
create index campaign_status_campaign_id_idx on public.campaign_status (campaign_id);
create index campaign_status_profile_id_idx on public.campaign_status (profile_id);

create trigger set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.campaign_status
  for each row execute function public.set_updated_at();
