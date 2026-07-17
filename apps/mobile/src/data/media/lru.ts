// LRU eviction policy for the media cache (system design §6.2: "LRU eviction never
// touches lyrics/solfa text"). Pure: given the current cache contents and a budget,
// it names the least-recently-used *audio/PDF* files to delete so an incoming
// download fits. Text assets are never eviction candidates.

import type { CacheEntry, MediaAssetType } from './types';

/** Asset kinds the LRU must never delete — the offline text fallback the whole
 *  app leans on (§6.2, design system §8 "Respect the offline-first reality"). */
const PROTECTED: ReadonlySet<MediaAssetType> = new Set<MediaAssetType>(['lyrics', 'solfa']);

export function isEvictable(entry: CacheEntry): boolean {
  return !PROTECTED.has(entry.assetType);
}

export interface EvictionPlan {
  /** Ids to delete, oldest-access first. */
  evict: string[];
  /** Bytes reclaimed by `evict`. */
  freedBytes: number;
  /** True when eviction (plus the incoming file) fits under `limitBytes`. */
  fits: boolean;
}

export interface EvictionInput {
  entries: CacheEntry[];
  limitBytes: number;
  /** Size of the file about to be written; 0 when simply trimming to budget. */
  incomingBytes?: number;
}

/**
 * Plan the eviction needed to fit `incomingBytes` under `limitBytes`.
 *
 * Protected (lyrics/solfa) entries count toward the used total but are never
 * evicted. Evictable entries are removed strictly least-recently-used first, and
 * only as many as needed. If even evicting every evictable file can't make room,
 * `fits` is false and every evictable id is returned (best effort — the caller
 * still frees what it can).
 */
export function planEviction({
  entries,
  limitBytes,
  incomingBytes = 0,
}: EvictionInput): EvictionPlan {
  const used = entries.reduce((sum, e) => sum + e.bytes, 0);
  let projected = used + incomingBytes;

  if (projected <= limitBytes) return { evict: [], freedBytes: 0, fits: true };

  // Oldest access first; ties broken by smaller file so we free the count we need
  // with the least collateral.
  const candidates = entries
    .filter(isEvictable)
    .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt || a.bytes - b.bytes);

  const evict: string[] = [];
  let freedBytes = 0;
  for (const entry of candidates) {
    if (projected <= limitBytes) break;
    evict.push(entry.id);
    freedBytes += entry.bytes;
    projected -= entry.bytes;
  }

  return { evict, freedBytes, fits: projected <= limitBytes };
}
