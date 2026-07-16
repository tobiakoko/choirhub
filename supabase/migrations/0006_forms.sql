-- 0006_forms.sql
-- Schema-driven forms and offline-submitted responses. Data model: §4. A form is
-- visible to its location (or region-wide when location_id is null).

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  fields jsonb not null default '[]'::jsonb,
  deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index forms_region_id_idx on public.forms (region_id);
create index forms_location_id_idx on public.forms (location_id);

create table public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  response jsonb not null default '{}'::jsonb,
  client_uuid uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (form_id, profile_id),
  unique (client_uuid)
);
create index form_responses_profile_id_idx on public.form_responses (profile_id);

create trigger set_updated_at before update on public.forms
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.form_responses
  for each row execute function public.set_updated_at();
