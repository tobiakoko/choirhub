// The live repertoire query. Observes the two local song tables and folds them
// through the pure repertoire model, so the library reflects WatermelonDB and
// works fully offline (observe → auto-update, CLAUDE.md rule 3). No network here:
// song text arrives via the sync delta; audio is resolved lazily by the media
// cache when a member presses play.

import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';

import { database } from '@/data/database';
import { Song, SongAsset, Tables } from '@/data/models';
import { useObservable } from '@/features/feed/useObservable';

import { buildRepertoire, type AssetRow, type RepertoireSong, type SongRow } from './songsModel';

const notDeleted = () => [Q.where('deleted_at', null)];

export interface UseSongsParams {
  /** The member's voice part, so their line is promoted (§7.2). Null = none chosen. */
  voicePart: string | null;
}

export interface UseSongs {
  songs: RepertoireSong[];
  isEmpty: boolean;
}

export function useSongs({ voicePart }: UseSongsParams): UseSongs {
  const songs = useObservable<Song[]>(
    () =>
      database
        .get<Song>(Tables.songs)
        .query(...notDeleted())
        .observe(),
    [],
    []
  );
  const assets = useObservable<SongAsset[]>(
    () =>
      database
        .get<SongAsset>(Tables.songAssets)
        .query(...notDeleted())
        .observe(),
    [],
    []
  );

  const songRows = useMemo<SongRow[]>(
    () =>
      songs.map((s) => ({
        id: s.id,
        title: s.title,
        composer: s.composer ?? null,
        songKey: s.songKey ?? null,
        tempo: s.tempo ?? null,
        tags: s.tags,
      })),
    [songs]
  );

  const assetRows = useMemo<AssetRow[]>(
    () =>
      assets.map((a) => ({
        id: a.id,
        songId: a.songId,
        assetType: a.assetType,
        voicePart: a.voicePart ?? null,
        content: a.content ?? null,
        renditions: a.renditions,
      })),
    [assets]
  );

  const repertoire = useMemo(
    () => buildRepertoire(songRows, assetRows, voicePart),
    [songRows, assetRows, voicePart]
  );

  return { songs: repertoire, isEmpty: repertoire.length === 0 };
}
