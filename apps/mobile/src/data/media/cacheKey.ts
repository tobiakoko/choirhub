// Deterministic cache keys / filenames for cached renditions. The key must be
// stable across app restarts so a resumed download lands on the same partial file
// (§6.2 resumable range requests), and unique per (asset, rendition) so a member
// who switches voice parts or a Wi-Fi AAC vs cellular Opus never collide.

const EXT: Record<string, string> = { opus: 'opus', aac: 'm4a' };

/** Filename for a cached audio rendition, e.g. `assetId__opus_24k.opus`. */
export function audioCacheKey(assetId: string, renditionKey: string): string {
  const codec = renditionKey.split('_')[0];
  const ext = EXT[codec] ?? 'bin';
  return `${assetId}__${renditionKey}.${ext}`;
}

/** Filename for a cached score PDF. */
export function pdfCacheKey(assetId: string): string {
  return `${assetId}.pdf`;
}
