-- 0015_notification_delivery.sql
-- Server-side recipient resolution for the notification pipeline (§6.3). The three
-- delivery jobs live in edge functions (supabase/functions/notify*), but *who*
-- receives a notification is decided here, in the security boundary (rule #2):
--
--   * fanout_recipients()      — on-publish fan-out: every approved member an
--                                announcement targets, with their tokens + prefs.
--   * digest_recipients()      — the pg_cron daily digest: members whose local
--                                digest hour is now, with their pending Normal posts.
--   * escalation_candidates()  — campaigns with a live deadline still holding
--                                pending members (the edge computes T-72h/T-24h).
--   * escalation_recipients()  — the pending members of one campaign, with tokens.
--   * record_escalation()      — idempotency latch so a tier fires at most once.
--
-- All are SECURITY DEFINER so a job can read tokens/prefs across members. Access is
-- gated *inside* each function: the on-publish resolver is callable only by the
-- announcement's author (fan-out is kicked from the author's client) or by a
-- service-role job (auth.uid() is null); the cron resolvers are service-role only.

-- ── escalation idempotency log ───────────────────────────────────────────────
create table public.escalation_sent (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  tier text not null check (tier in ('T-72h', 'T-24h')),
  sent_at timestamptz not null default now(),
  primary key (campaign_id, tier)
);
-- No RLS grants to authenticated: this is job-only bookkeeping, reached exclusively
-- through the SECURITY DEFINER resolvers below.
alter table public.escalation_sent enable row level security;

-- ── fanout_recipients(): approved members an announcement targets ────────────
create or replace function public.fanout_recipients(p_announcement_id uuid)
returns table (
  profile_id uuid,
  token text,
  platform public.push_platform,
  phone text,
  muted boolean,
  quiet_hours_start smallint,
  quiet_hours_end smallint,
  digest_hour smallint,
  timezone text,
  language text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
begin
  select a.author_id into v_author
  from public.announcements a
  where a.id = p_announcement_id and a.deleted_at is null;
  if v_author is null then
    return; -- unknown / deleted announcement → no recipients
  end if;

  -- Author's client kicks fan-out; a service-role job (auth.uid() null) may also.
  if v_uid is not null and v_uid <> v_author then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  return query
    select p.id,
           t.token,
           t.platform,
           p.phone,
           (a.category = any (coalesce(np.muted_categories, '{}'))) as muted,
           np.quiet_hours_start,
           np.quiet_hours_end,
           coalesce(np.digest_hour, 20)::smallint,
           coalesce(np.timezone, 'UTC'),
           coalesce(np.language, 'en')
    from public.announcements a
    join public.profiles p
      on p.status = 'approved'
      and p.id <> a.author_id
      and public.announcement_matches(a.id, p.id)
    join public.push_tokens t
      on t.profile_id = p.id and t.deleted_at is null
    left join public.notification_prefs np on np.profile_id = p.id
    where a.id = p_announcement_id;
end;
$$;

grant execute on function public.fanout_recipients(uuid) to authenticated, service_role;

-- ── digest_recipients(): members due a digest now, with pending Normal posts ──
-- One row per member whose local hour equals their digest_hour. `items` is the
-- jsonb array of Normal-priority announcements published in the last 24h that
-- target them, excluding muted categories and their own posts. Members with no
-- pending items are omitted (nothing to send).
create or replace function public.digest_recipients()
returns table (
  profile_id uuid,
  token text,
  platform public.push_platform,
  timezone text,
  language text,
  items jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  return query
  with due as (
    select np.profile_id, coalesce(np.timezone, 'UTC') as tz, coalesce(np.language, 'en') as lang
    from public.notification_prefs np
    where extract(hour from (now() at time zone coalesce(np.timezone, 'UTC')))::int
          = coalesce(np.digest_hour, 20)
  ),
  pending as (
    select d.profile_id,
           jsonb_agg(
             jsonb_build_object('id', a.id, 'title', a.title, 'category', a.category)
             order by a.publish_at desc
           ) as items
    from due d
    join public.announcements a
      on a.priority = 'normal'
      and a.deleted_at is null
      and a.publish_at > now() - interval '24 hours'
      and a.publish_at <= now()
      and a.author_id <> d.profile_id
      and public.announcement_matches(a.id, d.profile_id)
    left join public.notification_prefs np on np.profile_id = d.profile_id
    where not (a.category = any (coalesce(np.muted_categories, '{}')))
    group by d.profile_id
  )
  select d.profile_id, t.token, t.platform, d.tz, d.lang, pg.items
  from due d
  join pending pg on pg.profile_id = d.profile_id
  join public.push_tokens t on t.profile_id = d.profile_id and t.deleted_at is null;
end;
$$;

grant execute on function public.digest_recipients() to service_role;

-- ── escalation_candidates(): campaigns with a live deadline + pending members ─
-- The hourly escalation job pulls these and computes, per campaign, whether the
-- T-72h or T-24h window is open right now (pure TS in the edge). Only campaigns
-- still holding at least one pending member are returned.
create or replace function public.escalation_candidates()
returns table (campaign_id uuid, title text, deadline timestamptz, pending_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  return query
    select c.id, c.title, c.deadline, count(s.*)::int
    from public.campaigns c
    join public.campaign_status s
      on s.campaign_id = c.id and s.status = 'pending' and s.deleted_at is null
    where c.deleted_at is null
      and c.deadline is not null
      and c.deadline > now()
    group by c.id, c.title, c.deadline;
end;
$$;

grant execute on function public.escalation_candidates() to service_role;

-- ── escalation_recipients(): pending members of one campaign, with tokens ─────
create or replace function public.escalation_recipients(p_campaign_id uuid)
returns table (
  profile_id uuid,
  token text,
  platform public.push_platform,
  phone text,
  quiet_hours_start smallint,
  quiet_hours_end smallint,
  timezone text,
  language text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Escalation is a cron concern (service-role, auth.uid() null). The interactive
  -- "remind pending only" action for leaders stays on remind_pending_members (0012).
  if auth.uid() is not null then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  return query
    select p.id,
           t.token,
           t.platform,
           p.phone,
           np.quiet_hours_start,
           np.quiet_hours_end,
           coalesce(np.timezone, 'UTC'),
           coalesce(np.language, 'en')
    from public.campaign_status s
    join public.profiles p on p.id = s.profile_id and p.status = 'approved'
    join public.push_tokens t on t.profile_id = p.id and t.deleted_at is null
    left join public.notification_prefs np on np.profile_id = p.id
    where s.campaign_id = p_campaign_id
      and s.status = 'pending'
      and s.deleted_at is null;
end;
$$;

grant execute on function public.escalation_recipients(uuid) to service_role;

-- ── record_escalation(): latch a tier so it fires at most once per campaign ───
-- Returns true when this call is the first to claim (campaign, tier) — the edge
-- only dispatches when it wins the latch, making the hourly job idempotent.
create or replace function public.record_escalation(p_campaign_id uuid, p_tier text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if auth.uid() is not null then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  insert into public.escalation_sent (campaign_id, tier)
  values (p_campaign_id, p_tier)
  on conflict (campaign_id, tier) do nothing;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function public.record_escalation(uuid, text) to service_role;

-- ── pg_cron scheduling (guarded) ─────────────────────────────────────────────
-- The digest + escalation jobs run hourly. Scheduling calls the edge functions
-- through pg_net using a base URL + service key stored in private.notification_config
-- (never committed — the row is absent by default, so the dispatcher is a no-op
-- locally and in CI). Everything is wrapped so a bare-Postgres image without
-- pg_cron/pg_net does not fail `db reset` — the pipeline simply isn't scheduled there.
do $$
begin
  create schema if not exists private;

  create table if not exists private.notification_config (
    id boolean primary key default true,
    edge_base_url text not null,
    service_key text not null,
    constraint notification_config_singleton check (id)
  );

  -- Dispatcher: POST {} to an edge function iff config is present. SECURITY DEFINER
  -- so cron (postgres) can read the config; no grants to app roles.
  create or replace function private.dispatch_notification_job(p_fn text)
  returns void
  language plpgsql
  security definer
  set search_path = private, public, extensions
  as $fn$
  declare
    cfg private.notification_config;
  begin
    select * into cfg from private.notification_config where id;
    if not found then
      return; -- unconfigured (local/CI) → no-op
    end if;
    perform net.http_post(
      url := cfg.edge_base_url || '/' || p_fn,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cfg.service_key
      ),
      body := '{}'::jsonb
    );
  end;
  $fn$;

  perform cron.schedule(
    'notify-digest-hourly', '0 * * * *',
    $cron$ select private.dispatch_notification_job('notify-digest'); $cron$
  );
  perform cron.schedule(
    'notify-escalation-hourly', '15 * * * *',
    $cron$ select private.dispatch_notification_job('notify-escalation'); $cron$
  );
exception
  when undefined_function or undefined_table or invalid_schema_name then
    -- pg_cron / pg_net unavailable in this environment; skip scheduling.
    raise notice 'notification cron not scheduled: %', sqlerrm;
end $$;
