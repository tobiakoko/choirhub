import { audioCacheKey } from './cacheKey';
import { audioAssetRef, createMediaCacheManager, createMemoryCacheIndex } from './cacheManager';
import type { CacheEntry, MediaStore, NetworkContext, StoredFile } from './types';

const RENDITIONS = {
  opus_24k: { url: 'https://cdn/tenor.opus', bytes: 1000, durationSec: 245 },
  aac_96k: { url: 'https://cdn/tenor.m4a', bytes: 3000, durationSec: 245 },
};

const asset = () => audioAssetRef('song1', 'part_audio', RENDITIONS);

/** In-memory MediaStore fake: tracks files + records every download. */
function fakeStore(initial: Record<string, number> = {}) {
  const files = new Map<string, number>(Object.entries(initial));
  const downloads: string[] = [];
  const removes: string[] = [];
  const store: MediaStore = {
    uriFor: (key) => `file:///media/${key}`,
    async info(key): Promise<StoredFile> {
      const bytes = files.get(key);
      return { uri: `file:///media/${key}`, exists: bytes != null, bytes: bytes ?? 0 };
    },
    async download(key): Promise<StoredFile> {
      downloads.push(key);
      files.set(key, 1000);
      return { uri: `file:///media/${key}`, exists: true, bytes: 1000 };
    },
    async remove(key) {
      removes.push(key);
      files.delete(key);
    },
  };
  return { store, files, downloads, removes };
}

const ctx = (over: Partial<NetworkContext> = {}): NetworkContext => ({
  networkType: 'wifi',
  dataSaver: false,
  ...over,
});

const OPUS_KEY = audioCacheKey('song1', 'opus_24k');
const AAC_KEY = audioCacheKey('song1', 'aac_96k');

describe('MediaCacheManager — airplane-mode playback', () => {
  it('resolves a cached part to its local file while offline', async () => {
    // Opus was cached earlier on cellular; the member now opens it in airplane mode.
    const { store } = fakeStore({ [OPUS_KEY]: 1000 });
    const manager = createMediaCacheManager({
      store,
      getNetworkContext: async () => ctx({ networkType: 'none' }),
      limitBytes: 10_000,
    });

    const source = await manager.resolveSource(asset());
    expect(source).toEqual({ kind: 'local', uri: `file:///media/${OPUS_KEY}` });
    expect(await manager.isCached(asset())).toBe(true);
  });

  it('is unavailable when nothing is cached and offline', async () => {
    const { store } = fakeStore();
    const manager = createMediaCacheManager({
      store,
      getNetworkContext: async () => ctx({ networkType: 'none' }),
      limitBytes: 10_000,
    });
    expect(await manager.resolveSource(asset())).toEqual({ kind: 'unavailable' });
  });
});

describe('MediaCacheManager — download gating', () => {
  it('queues the download (Wi-Fi only) under Data Saver on cellular', async () => {
    const { store, downloads } = fakeStore();
    const manager = createMediaCacheManager({
      store,
      getNetworkContext: async () => ctx({ networkType: 'cellular', dataSaver: true }),
      limitBytes: 10_000,
    });
    expect(await manager.ensureAudio(asset())).toEqual({
      status: 'queued',
      reason: 'wifi-only-queue',
    });
    expect(downloads).toEqual([]);
  });

  it('reports offline when there is no connection', async () => {
    const { store } = fakeStore();
    const manager = createMediaCacheManager({
      store,
      getNetworkContext: async () => ctx({ networkType: 'none' }),
      limitBytes: 10_000,
    });
    expect(await manager.ensureAudio(asset())).toEqual({ status: 'offline' });
  });

  it('downloads the network-appropriate rendition on Wi-Fi (AAC)', async () => {
    const { store, downloads } = fakeStore();
    const manager = createMediaCacheManager({
      store,
      getNetworkContext: async () => ctx({ networkType: 'wifi' }),
      limitBytes: 10_000,
    });
    const result = await manager.ensureAudio(asset());
    expect(result.status).toBe('cached');
    expect(downloads).toEqual([AAC_KEY]);
  });

  it('no-ops when the file is already cached', async () => {
    const { store, downloads } = fakeStore({ [AAC_KEY]: 3000 });
    const manager = createMediaCacheManager({
      store,
      getNetworkContext: async () => ctx({ networkType: 'wifi' }),
      limitBytes: 10_000,
    });
    const result = await manager.ensureAudio(asset());
    expect(result.status).toBe('cached');
    expect(downloads).toEqual([]);
  });
});

describe('MediaCacheManager — LRU eviction before download', () => {
  it('evicts the least-recently-used audio to stay under budget', async () => {
    // Budget 2000; one stale 1500-byte audio already cached; new download is 1000.
    const stale: CacheEntry = {
      id: 'stale__opus_24k.opus',
      assetType: 'part_audio',
      bytes: 1500,
      lastAccessedAt: 1,
    };
    const { store, removes } = fakeStore({ 'stale__opus_24k.opus': 1500 });
    const index = createMemoryCacheIndex([stale]);
    const manager = createMediaCacheManager({
      store,
      getNetworkContext: async () => ctx({ networkType: 'wifi' }),
      limitBytes: 2000,
      index,
    });

    const result = await manager.ensureAudio(asset());
    expect(result.status).toBe('cached');
    expect(removes).toContain('stale__opus_24k.opus');
    expect(index.get('stale__opus_24k.opus')).toBeUndefined();
  });
});
