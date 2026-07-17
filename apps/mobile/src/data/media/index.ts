// Public surface of the media cache (system design §6.2). Pure policies are
// exported for the songs feature + tests; the production singleton wires them to
// the device (expo-file-system + expo-network).

import { createMediaCacheManager, type MediaCacheManager } from './cacheManager';
import { fileSystemStore } from './fileSystemStore';
import { getNetworkType } from './networkInfo';
import type { NetworkContext } from './types';

export * from './types';
export {
  parseRenditions,
  renditionBytes,
  selectRendition,
  type RenditionChoice,
} from './rendition';
export { canDownloadNow, shouldDrainQueue, type DownloadGate } from './networkPolicy';
export { planEviction, isEvictable, type EvictionPlan, type EvictionInput } from './lru';
export { audioCacheKey, pdfCacheKey } from './cacheKey';
export { resolvePlaybackSource, type PlaybackSource, type ResolveInput } from './resolveSource';
export { formatBytes, formatClock } from './format';
export { getNetworkType, isOnline } from './networkInfo';
export { isCharging } from './deviceState';
export { fileSystemStore } from './fileSystemStore';
export {
  createMediaCacheManager,
  createMemoryCacheIndex,
  audioAssetRef,
  type MediaCacheManager,
  type CacheManagerDeps,
  type CacheIndex,
  type AudioAssetRef,
  type EnsureResult,
} from './cacheManager';

/** On-disk budget for cached renditions (~200MB). Text (lyrics/solfa) is never
 *  counted against it and never evicted. */
export const MEDIA_CACHE_BUDGET_BYTES = 200 * 1024 * 1024;

let dataSaver = false;
/** Wire the profile's Data Saver flag into the cache's network context (§6.2). */
export function setDataSaver(enabled: boolean): void {
  dataSaver = enabled;
}

async function currentNetworkContext(): Promise<NetworkContext> {
  return { networkType: await getNetworkType(), dataSaver };
}

let singleton: MediaCacheManager | null = null;

/** The app-wide media cache. Lazy so tests can build isolated managers instead. */
export function getMediaCache(): MediaCacheManager {
  if (!singleton) {
    singleton = createMediaCacheManager({
      store: fileSystemStore,
      getNetworkContext: currentNetworkContext,
      limitBytes: MEDIA_CACHE_BUDGET_BYTES,
    });
  }
  return singleton;
}
