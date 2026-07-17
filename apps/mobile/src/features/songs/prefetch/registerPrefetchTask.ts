// Rehearsal-pack prefetch runner + background-task definition (system design §6.2).
// The decision logic is pure (rehearsalPack.ts); this file supplies live device
// state and drives the media cache. Every dependency is injected so the runner is
// testable, and expo-task-manager is touched only to register the background hook.

import * as TaskManager from 'expo-task-manager';

import {
  audioAssetRef,
  getNetworkType,
  isCharging,
  getMediaCache,
  type MediaCacheManager,
  type NetworkType,
} from '@/data/media';

import {
  planRehearsalPrefetch,
  shouldRunPrefetch,
  type PrefetchAsset,
  type PrefetchEvent,
} from './rehearsalPack';

export const REHEARSAL_PREFETCH_TASK = 'choirhub.rehearsal-pack-prefetch';

export interface PrefetchDeps {
  getNetworkType: () => Promise<NetworkType>;
  isCharging: () => Promise<boolean>;
  loadEvents: () => Promise<PrefetchEvent[]>;
  loadAssets: () => Promise<PrefetchAsset[]>;
  /** Songs scheduled per upcoming event. No local event→song link exists yet, so
   *  the caller resolves it (defaults to none → nothing prefetched). */
  resolveSongIds: (eventIds: string[]) => Promise<ReadonlyMap<string, readonly string[]>>;
  getVoicePart: () => Promise<string | null>;
  cache: MediaCacheManager;
  now?: () => number;
}

export interface PrefetchOutcome {
  ran: boolean;
  reason?: 'not-wifi-or-charging';
  downloaded: number;
}

/**
 * Prefetch the member's own-part audio for events within 24h — but only on Wi-Fi
 * and charging. Skips everything otherwise, so it's safe to call opportunistically
 * (on launch/foreground) as well as from the background task.
 */
export async function runRehearsalPrefetch(deps: PrefetchDeps): Promise<PrefetchOutcome> {
  const now = deps.now ?? Date.now;
  const [networkType, charging] = await Promise.all([deps.getNetworkType(), deps.isCharging()]);

  if (!shouldRunPrefetch({ networkType, charging })) {
    return { ran: false, reason: 'not-wifi-or-charging', downloaded: 0 };
  }

  const [events, assets, voicePart] = await Promise.all([
    deps.loadEvents(),
    deps.loadAssets(),
    deps.getVoicePart(),
  ]);

  const songIdsByEventId = await deps.resolveSongIds(events.map((e) => e.id));
  const targets = planRehearsalPrefetch({
    events,
    assets,
    songIdsByEventId,
    voicePart,
    now: now(),
  });

  let downloaded = 0;
  for (const asset of targets) {
    const result = await deps.cache.ensureAudio(
      audioAssetRef(asset.id, 'part_audio', asset.renditions)
    );
    if (result.status === 'cached') downloaded += 1;
  }
  return { ran: true, downloaded };
}

// ── production wiring ────────────────────────────────────────────────────────

/** Default deps reading WatermelonDB + device state. Imported lazily inside the
 *  task body so this module has no side effects at import time. */
async function productionDeps(): Promise<PrefetchDeps> {
  const { database } = await import('@/data/database');
  const { Tables } = await import('@/data/models');
  const { Q } = await import('@nozbe/watermelondb');
  type Event = import('@/data/models').Event;
  type SongAsset = import('@/data/models').SongAsset;

  const loadEvents = async (): Promise<PrefetchEvent[]> => {
    const rows = await database
      .get<Event>(Tables.events)
      .query(Q.where('deleted_at', null))
      .fetch();
    return rows.map((e) => ({ id: e.id, startsAt: e.startsAt, deletedAt: e.deletedAt ?? null }));
  };

  const loadAssets = async (): Promise<PrefetchAsset[]> => {
    const rows = await database
      .get<SongAsset>(Tables.songAssets)
      .query(Q.where('deleted_at', null), Q.where('asset_type', 'part_audio'))
      .fetch();
    return rows.map((a) => ({
      id: a.id,
      songId: a.songId,
      assetType: a.assetType,
      voicePart: a.voicePart ?? null,
      renditions: a.renditions,
    }));
  };

  return {
    getNetworkType,
    isCharging,
    loadEvents,
    loadAssets,
    // No event↔song association in the local mirror yet — resolve to empty until
    // that table syncs. The runner then no-ops rather than guessing.
    resolveSongIds: async () => new Map<string, readonly string[]>(),
    getVoicePart: async () => null,
    cache: getMediaCache(),
  };
}

/**
 * Register the background prefetch task. The task body only *runs* the prefetch;
 * scheduling it on a periodic background-fetch trigger is wired at app init once a
 * fetch provider is configured. Safe to call more than once.
 */
export function registerRehearsalPackPrefetch(): void {
  if (TaskManager.isTaskDefined(REHEARSAL_PREFETCH_TASK)) return;
  TaskManager.defineTask(REHEARSAL_PREFETCH_TASK, async () => {
    try {
      const deps = await productionDeps();
      await runRehearsalPrefetch(deps);
    } catch (error) {
      console.error('[choirhub] rehearsal-pack prefetch failed', error);
    }
  });
}
