// Pure daily-digest batching (§6.3). Normal-priority announcements are silent and
// folded into one digest push per day at the member's chosen hour. This is the
// message the digest cron builds from a member's pending Normal posts; kept pure
// so the batching/summarising is exercised by jest (the edge job calls the same
// shape via its own mirror).

export interface DigestItem {
  id: string;
  title: string;
  category: string;
}

export interface DigestMessage {
  title: string;
  body: string;
  count: number;
  data: { type: 'digest' };
}

/** How many item titles to spell out before collapsing into "+N more". */
export const DIGEST_PREVIEW_LIMIT = 3;

/**
 * Build the digest push for a member's pending Normal announcements, or null when
 * there is nothing to send (no push at all — an empty digest is never delivered).
 */
export function buildDigest(items: readonly DigestItem[]): DigestMessage | null {
  const count = items.length;
  if (count === 0) return null;

  const title = count === 1 ? '1 new update' : `${count} new updates`;
  const shown = items.slice(0, DIGEST_PREVIEW_LIMIT).map((i) => i.title);
  const remainder = count - shown.length;
  const body = remainder > 0 ? `${shown.join(' · ')} +${remainder} more` : shown.join(' · ');

  return { title, body, count, data: { type: 'digest' } };
}
