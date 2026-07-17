// Rendition parsing + selection (system design §6.2). Decodes the
// `song_assets.renditions` jsonb into typed entries and picks the right one for
// the moment: Opus 24k on cellular / under Data Saver (the ~0.7MB/4min budget),
// AAC 96k on Wi-Fi where bandwidth is cheap. Pure — the download layer consumes
// the choice and decides *when* to fetch (see networkPolicy.ts).

import type { AudioCodec, NetworkContext, Rendition } from './types';

/** Known rendition keys → codec + bitrate. Unknown keys are parsed leniently
 *  (`opus_*`/`aac_*` prefixes) so a future bitrate doesn't need a code change. */
const KNOWN: Record<string, { codec: AudioCodec; bitrateKbps: number }> = {
  opus_24k: { codec: 'opus', bitrateKbps: 24 },
  aac_96k: { codec: 'aac', bitrateKbps: 96 },
};

function decodeKey(key: string): { codec: AudioCodec; bitrateKbps: number } | null {
  if (KNOWN[key]) return KNOWN[key];
  const match = /^(opus|aac)_(\d+)k$/.exec(key);
  if (!match) return null;
  return { codec: match[1] as AudioCodec, bitrateKbps: Number(match[2]) };
}

/**
 * Normalise the raw jsonb map into typed renditions. Each value may be a bare url
 * string (legacy rows) or `{ url, bytes?, durationSec? }`. Entries whose key we
 * can't classify as an audio codec are dropped.
 */
export function parseRenditions(raw: Record<string, unknown>): Rendition[] {
  const out: Rendition[] = [];
  for (const [key, value] of Object.entries(raw ?? {})) {
    const decoded = decodeKey(key);
    if (!decoded) continue;

    let url: string | undefined;
    let bytes: number | undefined;
    let durationSec: number | undefined;

    if (typeof value === 'string') {
      url = value;
    } else if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.url === 'string') url = obj.url;
      if (typeof obj.bytes === 'number') bytes = obj.bytes;
      if (typeof obj.durationSec === 'number') durationSec = obj.durationSec;
    }
    if (!url) continue;

    out.push({
      key,
      url,
      codec: decoded.codec,
      bitrateKbps: decoded.bitrateKbps,
      bytes,
      durationSec,
    });
  }
  return out;
}

/** Best available size in bytes for a rendition: the recorded value, else an
 *  estimate from bitrate × duration (bits→bytes). Undefined when neither is known. */
export function renditionBytes(rendition: Rendition): number | undefined {
  if (typeof rendition.bytes === 'number') return rendition.bytes;
  if (typeof rendition.durationSec === 'number') {
    return Math.round((rendition.bitrateKbps * 1000 * rendition.durationSec) / 8);
  }
  return undefined;
}

export interface RenditionChoice {
  rendition: Rendition;
  /** Why this rendition won — surfaced in dev logs, not the UI. */
  reason: 'data-saver-opus' | 'cellular-opus' | 'wifi-aac' | 'only-available';
}

const byCodec = (list: Rendition[], codec: AudioCodec) => list.filter((r) => r.codec === codec);
/** Lowest-bitrate first, so a codec fallback favours the lean rendition. */
const leanest = (list: Rendition[]) => [...list].sort((a, b) => a.bitrateKbps - b.bitrateKbps)[0];
const richest = (list: Rendition[]) => [...list].sort((a, b) => b.bitrateKbps - a.bitrateKbps)[0];

/**
 * Choose the rendition to fetch/play for the current network.
 *
 * - **Data Saver** → Opus everywhere (the low-bandwidth promise, §6.2).
 * - **Cellular** → Opus (protects the 2G/3G data budget).
 * - **Wi-Fi** → AAC for fuller quality when bandwidth is free.
 *
 * Falls back to whatever codec exists when the preferred one is missing. Returns
 * null only when there are no audio renditions at all.
 */
export function selectRendition(
  renditions: Rendition[],
  ctx: NetworkContext
): RenditionChoice | null {
  if (renditions.length === 0) return null;

  const opus = byCodec(renditions, 'opus');
  const aac = byCodec(renditions, 'aac');

  const preferOpus = ctx.dataSaver || ctx.networkType === 'cellular';

  if (preferOpus) {
    if (opus.length > 0) {
      return {
        rendition: leanest(opus),
        reason: ctx.dataSaver ? 'data-saver-opus' : 'cellular-opus',
      };
    }
    // No Opus — take the leanest AAC rather than fail.
    return { rendition: leanest(aac), reason: 'only-available' };
  }

  // Wi-Fi (or unknown/none, where we optimistically pick the richer file).
  if (aac.length > 0) return { rendition: richest(aac), reason: 'wifi-aac' };
  return { rendition: leanest(opus), reason: 'only-available' };
}
