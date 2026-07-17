-- 0014_notification_prefs.sql
-- Per-member notification preferences (§6.3 + settings screens): which categories
-- to mute, quiet hours, the daily-digest hour, Data Saver, and UI language. One
-- row per profile. The delivery jobs (0015) read these to decide whether a member
-- gets a push now, is folded into their digest, or is suppressed during quiet hours.
--
-- Hours are stored in the member's *local* time together with their IANA timezone,
-- so the hourly digest cron can compute each member's local hour server-side
-- (`now() at time zone timezone`) without the client having to be awake.
--
-- RLS: a member reads and writes only their own row (the delivery jobs read every
-- row through SECURITY DEFINER resolvers in 0015, never through this policy).

create table public.notification_prefs (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  -- Categories the member has muted; a muted category never pushes and is not
  -- folded into the digest. Empty = everything on.
  muted_categories public.announcement_category[] not null default '{}',
  -- Local-time quiet-hours window [start, end); null/null = disabled. A window that
  -- wraps midnight (e.g. 22 → 7) is honoured by the resolver.
  quiet_hours_start smallint,
  quiet_hours_end smallint,
  -- Local hour (0–23) at which the Normal digest is delivered.
  digest_hour smallint not null default 20,
  -- Mirrors the client Data Saver flag (§6.2) so it survives reinstall; the media
  -- cache still reads the device-local copy for its gating.
  data_saver boolean not null default false,
  -- UI language placeholder (§ settings): 'en' today, 'fr'/'yo' in P4.
  language text not null default 'en',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint nprefs_digest_hour_range check (digest_hour between 0 and 23),
  constraint nprefs_quiet_start_range
    check (quiet_hours_start is null or quiet_hours_start between 0 and 23),
  constraint nprefs_quiet_end_range
    check (quiet_hours_end is null or quiet_hours_end between 0 and 23),
  -- Quiet hours are all-or-nothing: both bounds set, or both null.
  constraint nprefs_quiet_pair
    check ((quiet_hours_start is null) = (quiet_hours_end is null)),
  constraint nprefs_language_supported check (language in ('en', 'fr', 'yo'))
);

create trigger set_updated_at before update on public.notification_prefs
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.notification_prefs to authenticated;
alter table public.notification_prefs enable row level security;

create policy notification_prefs_select on public.notification_prefs for select to authenticated
  using (profile_id = auth.uid());
create policy notification_prefs_insert on public.notification_prefs for insert to authenticated
  with check (profile_id = auth.uid());
create policy notification_prefs_update on public.notification_prefs for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
