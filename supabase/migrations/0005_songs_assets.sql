-- 0005_songs_assets.sql
-- Offline song library: songs and their per-voice-part assets. Data model: §4.
-- The library is region-wide repertoire; renditions (Opus/WebP) live on R2 and
-- are referenced from the renditions jsonb (§6.2).

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  title text not null,
  composer text,
  song_key text,
  tempo integer,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index songs_region_id_idx on public.songs (region_id);

-- asset_type lyrics/solfa carry text in content; score_pdf/part_audio carry a
-- storage_path (original) plus a renditions jsonb of CDN variants. voice_part is
-- set for part_audio.
create table public.song_assets (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  asset_type public.song_asset_type not null,
  voice_part public.voice_part,
  content text,
  storage_path text,
  renditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index song_assets_song_id_idx on public.song_assets (song_id);

create trigger set_updated_at before update on public.songs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.song_assets
  for each row execute function public.set_updated_at();
