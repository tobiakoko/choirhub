// Media cache manager (system design §6.2). Composes the pure policies — rendition
// choice, download gating, LRU eviction, source resolution — with the device file
// store into one object the songs feature calls. Every dependency is injected, so
// the queue/gating/eviction behaviour is exercised in tests against in-memory fakes
// (no expo-file-system, no network) and only `fileSystemStore` touches the platform.

import { audioCacheKey } from './cacheKey';
import { canDownloadNow } from './networkPolicy';
import { planEviction } from './lru';
import { parseRenditions, renditionBytes, selectRendition } from './rendition';
import { resolvePlaybackSource, type PlaybackSource } from './resolveSource';
import type { CacheEntry, MediaAssetType, MediaStore, NetworkContext, Rendition } from './types';

/** The heavy asset the manager caches — built from a SongAsset row by the caller. */
export interface AudioAssetRef {
  assetId: string;
  assetType: MediaAssetType;
  renditions: Rendition[];
}

/** Build an AudioAssetRef from a raw `song_assets.renditions` jsonb map. */
export function audioAssetRef(
  assetId: string,
  assetType: MediaAssetType,
  rawRenditions: Record<string, unknown>
): AudioAssetRef {
  return { assetId, assetType, renditions: parseRenditions(rawRenditions) };
}

export type EnsureResult =
  | { status: 'cached'; uri: string; bytes: number; rendition: Rendition }
  | { status: 'queued'; reason: 'wifi-only-queue' }
  | { status: 'offline' }
  | { status: 'no-rendition' }
  | { status: 'error'; error: unknown };

/** Minimal persisted index the LRU reasons over. In-memory by default; a real
 *  deployment can back it with the KV store so recency survives restarts. */
export interface CacheIndex {
  list(): CacheEntry[];
  get(id: string): CacheEntry | undefined;
  upsert(entry: CacheEntry): void;
  remove(id: string): void;
}

export function createMemoryCacheIndex(seed: CacheEntry[] = []): CacheIndex {
  const map = new Map<string, CacheEntry>(seed.map((e) => [e.id, e]));
  return {
    list: () => [...map.values()],
    get: (id) => map.get(id),
    upsert: (entry) => void map.set(entry.id, entry),
    remove: (id) => void map.delete(id),
  };
}

export interface CacheManagerDeps {
  store: MediaStore;
  getNetworkContext: () => Promise<NetworkContext>;
  /** On-disk budget for cached renditions. Text is never counted against it. */
  limitBytes: number;
  index?: CacheIndex;
  now?: () => number;
}

export interface MediaCacheManager {
  /** Download the right rendition for the current network, evicting LRU files to
   *  stay under budget. No-ops (returns `cached`) when already present. */
  ensureAudio(asset: AudioAssetRef, onProgress?: (fraction: number) => void): Promise<EnsureResult>;
  /** Resolve where the player should read from now — cache-first, offline-safe. */
  resolveSource(asset: AudioAssetRef): Promise<PlaybackSource>;
  /** True when the chosen rendition is already on disk. */
  isCached(asset: AudioAssetRef): Promise<boolean>;
  /** Bump recency when a member plays/opens a cached file. */
  touch(asset: AudioAssetRef): Promise<void>;
  /** Delete a cached rendition (member-initiated "remove download"). */
  remove(asset: AudioAssetRef): Promise<void>;
}

export function createMediaCacheManager({
  store,
  getNetworkContext,
  limitBytes,
  index = createMemoryCacheIndex(),
  now = Date.now,
}: CacheManagerDeps): MediaCacheManager {
  /** Chosen rendition + its cache key for the current network, or null. */
  async function pick(asset: AudioAssetRef, ctx: NetworkContext) {
    const choice = selectRendition(asset.renditions, ctx);
    if (!choice) return null;
    return { rendition: choice.rendition, key: audioCacheKey(asset.assetId, choice.rendition.key) };
  }

  /**
   * The first *cached* rendition on disk, preferring the network-selected one but
   * falling back to any other — so a file cached earlier on cellular (Opus) still
   * plays when the member later opens the song offline (airplane mode, §6.2).
   */
  async function cachedRendition(asset: AudioAssetRef, ctx: NetworkContext) {
    const choice = selectRendition(asset.renditions, ctx);
    const ordered: Rendition[] = [
      ...(choice ? [choice.rendition] : []),
      ...asset.renditions.filter((r) => !choice || r.key !== choice.rendition.key),
    ];
    for (const rendition of ordered) {
      const key = audioCacheKey(asset.assetId, rendition.key);
      const file = await store.info(key);
      if (file.exists) return { rendition, key, uri: file.uri, bytes: file.bytes };
    }
    return null;
  }

  async function ensureAudio(
    asset: AudioAssetRef,
    onProgress?: (fraction: number) => void
  ): Promise<EnsureResult> {
    const ctx = await getNetworkContext();
    const chosen = await pick(asset, ctx);
    if (!chosen) return { status: 'no-rendition' };
    const { rendition, key } = chosen;

    const existing = await store.info(key);
    if (existing.exists) {
      index.upsert({
        id: key,
        assetType: asset.assetType,
        bytes: existing.bytes,
        lastAccessedAt: now(),
      });
      return { status: 'cached', uri: existing.uri, bytes: existing.bytes, rendition };
    }

    const gate = canDownloadNow(ctx);
    if (!gate.allowed) {
      return gate.reason === 'offline'
        ? { status: 'offline' }
        : { status: 'queued', reason: gate.reason };
    }

    // Make room before writing: never evict lyrics/solfa text (planEviction guards).
    const incomingBytes = renditionBytes(rendition) ?? 0;
    const plan = planEviction({ entries: index.list(), limitBytes, incomingBytes });
    for (const id of plan.evict) {
      await store.remove(id);
      index.remove(id);
    }

    try {
      const file = await store.download(key, rendition.url, onProgress);
      const bytes = file.bytes || incomingBytes;
      index.upsert({ id: key, assetType: asset.assetType, bytes, lastAccessedAt: now() });
      return { status: 'cached', uri: file.uri, bytes, rendition };
    } catch (error) {
      return { status: 'error', error };
    }
  }

  async function resolveSource(asset: AudioAssetRef): Promise<PlaybackSource> {
    const ctx = await getNetworkContext();
    const online = ctx.networkType === 'wifi' || ctx.networkType === 'cellular';
    const cached = await cachedRendition(asset, ctx);
    const choice = selectRendition(asset.renditions, ctx);
    return resolvePlaybackSource({
      localUri: cached?.uri ?? null,
      localExists: cached != null,
      remoteUrl: online && choice ? choice.rendition.url : null,
      isOnline: online,
    });
  }

  async function isCached(asset: AudioAssetRef): Promise<boolean> {
    const ctx = await getNetworkContext();
    return (await cachedRendition(asset, ctx)) != null;
  }

  async function touch(asset: AudioAssetRef): Promise<void> {
    const ctx = await getNetworkContext();
    const cached = await cachedRendition(asset, ctx);
    if (!cached) return;
    const entry = index.get(cached.key);
    index.upsert({
      id: cached.key,
      assetType: asset.assetType,
      bytes: entry?.bytes ?? cached.bytes,
      lastAccessedAt: now(),
    });
  }

  async function remove(asset: AudioAssetRef): Promise<void> {
    // Remove every cached rendition of the asset, not just the network-selected one.
    for (const rendition of asset.renditions) {
      const key = audioCacheKey(asset.assetId, rendition.key);
      if ((await store.info(key)).exists) {
        await store.remove(key);
        index.remove(key);
      }
    }
  }

  return { ensureAudio, resolveSource, isCached, touch, remove };
}
