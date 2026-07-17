// Rehearsal-pack prefetch policy (system design §6.2): "night before an event, on
// Wi-Fi + charging, the app silently downloads that event's songs for the member's
// own voice part only." Pure selection + gating; the background task
// (registerPrefetchTask.ts) supplies the live device state and drives the cache.

import type { NetworkType } from '@/data/media';

/** Prefetch horizon — events starting within the next 24h qualify (§6.2). */
export const REHEARSAL_PREFETCH_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface PrefetchEvent {
  id: string;
  startsAt: string;
  deletedAt?: string | null;
}

export interface PrefetchAsset {
  id: string;
  songId: string;
  assetType: string;
  voicePart?: string | null;
  renditions: Record<string, unknown>;
}

/** Upcoming events within the window: not deleted, starting after `now` and within
 *  `withinMs`, soonest first. */
export function upcomingRehearsalEvents(
  events: PrefetchEvent[],
  now: number,
  withinMs: number = REHEARSAL_PREFETCH_WINDOW_MS
): PrefetchEvent[] {
  return events
    .filter((e) => !e.deletedAt)
    .filter((e) => {
      const start = Date.parse(e.startsAt);
      return Number.isFinite(start) && start > now && start - now <= withinMs;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/** The member's *own-part* audio for a set of songs — never other parts (§6.2). */
export function selectOwnPartAudio(
  assets: PrefetchAsset[],
  songIds: ReadonlySet<string>,
  voicePart: string | null
): PrefetchAsset[] {
  if (!voicePart) return [];
  return assets.filter(
    (a) => a.assetType === 'part_audio' && a.voicePart === voicePart && songIds.has(a.songId)
  );
}

export interface PrefetchConditions {
  networkType: NetworkType;
  charging: boolean;
}

/** Prefetch only on Wi-Fi *and* charging, so it never spends cellular data or
 *  drains a battery overnight (§6.2). */
export function shouldRunPrefetch({ networkType, charging }: PrefetchConditions): boolean {
  return networkType === 'wifi' && charging;
}

export interface PlanPrefetchInput {
  events: PrefetchEvent[];
  assets: PrefetchAsset[];
  /** Song ids scheduled for each upcoming event. The local mirror has no
   *  event→song link yet, so the caller resolves it and hands it in. */
  songIdsByEventId: ReadonlyMap<string, readonly string[]>;
  voicePart: string | null;
  now: number;
  withinMs?: number;
}

/**
 * The full prefetch plan: the member's own-part audio assets for every song in an
 * event starting within the window, de-duplicated. Empty when there's no voice
 * part or nothing is due — the runner then does nothing.
 */
export function planRehearsalPrefetch({
  events,
  assets,
  songIdsByEventId,
  voicePart,
  now,
  withinMs = REHEARSAL_PREFETCH_WINDOW_MS,
}: PlanPrefetchInput): PrefetchAsset[] {
  const upcoming = upcomingRehearsalEvents(events, now, withinMs);
  const songIds = new Set<string>();
  for (const event of upcoming) {
    for (const songId of songIdsByEventId.get(event.id) ?? []) songIds.add(songId);
  }
  if (songIds.size === 0) return [];

  const seen = new Set<string>();
  const out: PrefetchAsset[] = [];
  for (const asset of selectOwnPartAudio(assets, songIds, voicePart)) {
    if (seen.has(asset.id)) continue;
    seen.add(asset.id);
    out.push(asset);
  }
  return out;
}
