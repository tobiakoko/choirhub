// Shared types for the media cache (system design §6.2). Text (lyrics/solfa) never
// lives here — it rides the sync delta into WatermelonDB. This layer only ever
// touches heavy renditions: per-part audio (Opus/AAC) and score PDFs, kept as
// files in expo-file-system and governed by an LRU that protects text.

/** Reachability class the rendition + download policy branches on (expo-network). */
export type NetworkType = 'wifi' | 'cellular' | 'none' | 'unknown';

/** Audio rendition codecs the media pipeline emits (§6.2). */
export type AudioCodec = 'opus' | 'aac';

/** Asset kinds. Only `part_audio`/`score_pdf` are cached as files; `lyrics`/`solfa`
 *  appear here solely so the LRU can guarantee it never evicts them. */
export type MediaAssetType = 'part_audio' | 'score_pdf' | 'lyrics' | 'solfa';

/** A single decoded rendition entry from `song_assets.renditions` (jsonb). */
export interface Rendition {
  /** Rendition key as stored in the jsonb map, e.g. `opus_24k`. */
  key: string;
  url: string;
  codec: AudioCodec;
  bitrateKbps: number;
  /** File size in bytes when the pipeline recorded it; absent on legacy rows. */
  bytes?: number;
  /** Track length in seconds — lets us estimate bytes when the pipeline omitted them. */
  durationSec?: number;
}

/** Inputs the rendition + download policy reads. `dataSaver` mirrors the profile
 *  flag auto-suggested on low-end/slow devices (§6.2). */
export interface NetworkContext {
  networkType: NetworkType;
  dataSaver: boolean;
}

/** A cached file the LRU reasons about. `bytes` is the on-disk size, `lastAccessedAt`
 *  an epoch-ms recency stamp bumped on every play/open. */
export interface CacheEntry {
  id: string;
  assetType: MediaAssetType;
  bytes: number;
  lastAccessedAt: number;
}

/** On-disk file facts the cache manager needs (thin slice of expo-file-system). */
export interface StoredFile {
  uri: string;
  exists: boolean;
  bytes: number;
}

/**
 * The device file-system port the cache manager writes through. Implemented over
 * `expo-file-system/legacy` in production and faked in tests, so the manager's
 * queue/gating/eviction logic stays platform-free.
 */
export interface MediaStore {
  /** Absolute local uri a cache key maps to (stable across resumes). */
  uriFor(key: string): string;
  info(key: string): Promise<StoredFile>;
  /** Download `url` → the key's uri, resuming from any partial bytes on disk. */
  download(key: string, url: string, onProgress?: (fraction: number) => void): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}
