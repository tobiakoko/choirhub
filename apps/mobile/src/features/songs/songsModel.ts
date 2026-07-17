// Pure repertoire model: fold songs + their per-part assets into the rows the
// library renders (design system §7.2). The member's own voice part is promoted —
// surfaced first and marked as primary — so a tenor opens straight to the tenor
// line without hunting (spec: "user's voice part promoted with VocalPartBadge").

import type { VocalPart } from '@choirhub/ui';

const VOCAL_PARTS: readonly VocalPart[] = ['soprano', 'alto', 'tenor', 'bass'];
/** Canonical part order when the member has no part of their own to promote. */
const PART_ORDER: Record<VocalPart, number> = { soprano: 0, alto: 1, tenor: 2, bass: 3 };

function asVocalPart(raw: string | null | undefined): VocalPart | null {
  return raw && (VOCAL_PARTS as readonly string[]).includes(raw) ? (raw as VocalPart) : null;
}

export interface SongRow {
  id: string;
  title: string;
  composer?: string | null;
  songKey?: string | null;
  tempo?: number | null;
  tags: string[];
}

export interface AssetRow {
  id: string;
  songId: string;
  assetType: string;
  voicePart?: string | null;
  content?: string | null;
  renditions: Record<string, unknown>;
}

export interface RepertoireAudioPart {
  assetId: string;
  voicePart: VocalPart | null;
  renditions: Record<string, unknown>;
  /** True for the member's own part — drives the promoted badge + default player. */
  isUserPart: boolean;
}

export interface RepertoireSong {
  id: string;
  title: string;
  composer: string | null;
  songKey: string | null;
  tempo: number | null;
  tags: string[];
  /** Audio parts, the member's own first (§7.2 promotion). */
  audioParts: RepertoireAudioPart[];
  /** The part the player opens on: the member's own if present, else the first. */
  primaryPart: RepertoireAudioPart | null;
  /** The member's own voice part, when the song has audio for it. */
  userPart: VocalPart | null;
  lyrics: string | null;
  solfa: string | null;
}

/**
 * Build the ordered repertoire. Audio parts sort the member's own part to the top
 * (then canonical SATB); lyrics/solfa text is attached from the matching assets.
 * `userVoicePart` may be null (part not chosen yet) — then nothing is promoted.
 */
export function buildRepertoire(
  songs: SongRow[],
  assets: AssetRow[],
  userVoicePart: string | null
): RepertoireSong[] {
  const part = asVocalPart(userVoicePart);
  const bySong = new Map<string, AssetRow[]>();
  for (const asset of assets) {
    const list = bySong.get(asset.songId);
    if (list) list.push(asset);
    else bySong.set(asset.songId, [asset]);
  }

  return songs.map((song) => {
    const own = bySong.get(song.id) ?? [];

    const audioParts: RepertoireAudioPart[] = own
      .filter((a) => a.assetType === 'part_audio')
      .map((a) => {
        const vp = asVocalPart(a.voicePart);
        return {
          assetId: a.id,
          voicePart: vp,
          renditions: a.renditions,
          isUserPart: part != null && vp === part,
        };
      })
      .sort((a, b) => {
        if (a.isUserPart !== b.isUserPart) return a.isUserPart ? -1 : 1;
        return (
          (a.voicePart ? PART_ORDER[a.voicePart] : 99) -
          (b.voicePart ? PART_ORDER[b.voicePart] : 99)
        );
      });

    const primaryPart = audioParts.find((p) => p.isUserPart) ?? audioParts[0] ?? null;
    const lyrics = own.find((a) => a.assetType === 'lyrics')?.content ?? null;
    const solfa = own.find((a) => a.assetType === 'solfa')?.content ?? null;

    return {
      id: song.id,
      title: song.title,
      composer: song.composer ?? null,
      songKey: song.songKey ?? null,
      tempo: song.tempo ?? null,
      tags: song.tags,
      audioParts,
      primaryPart,
      userPart: primaryPart?.isUserPart ? primaryPart.voicePart : null,
      lyrics,
      solfa,
    };
  });
}
