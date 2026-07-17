// Derives, per announcement, where the viewer stands on acknowledgment — and, for
// leaders, the roll-up completion count. Pure and dependency-free so the feed's
// core behaviour is unit-tested without React or WatermelonDB (matches the sync
// engine's testing shape).
//
// The optimistic-write contract (§6.1): the moment a member taps Acknowledge, the
// sync engine writes an acknowledgment row under `id = clientUuid` and queues that
// same uuid in the outbox. So a row exists immediately; whether it is still in the
// outbox tells us confirmed (✓) vs pending (🕓).

/** A locally-mirrored acknowledgment row (server: acknowledgments). */
export interface AckRow {
  /** WatermelonDB id — the client uuid for an optimistic row, the server id once confirmed. */
  id: string;
  announcementId: string;
  profileId: string;
}

/** Where the viewer stands on one announcement's acknowledgment. */
export type AckState = 'none' | 'pending' | 'done';

/**
 * The viewer's ack state for a single announcement.
 * - `none`   — no ack row for this member yet.
 * - `pending`— an optimistic ack whose uuid is still queued in the outbox (🕓).
 * - `done`   — an ack the server has confirmed (✓).
 */
export function deriveAckState(
  announcementId: string,
  viewerProfileId: string,
  acks: readonly AckRow[],
  pendingUuids: ReadonlySet<string>
): AckState {
  const mine = acks.find(
    (a) => a.announcementId === announcementId && a.profileId === viewerProfileId
  );
  if (!mine) return 'none';
  return pendingUuids.has(mine.id) ? 'pending' : 'done';
}

/** Leader roll-up for one announcement: how many members have acknowledged. */
export interface AckCompletion {
  acknowledged: number;
  /** Target audience size, when known (server-provided); drives the ratio. */
  total?: number;
  /** acknowledged / total in [0,1], or undefined when total is unknown. */
  ratio?: number;
}

/**
 * Count acknowledgments for an announcement (deduped by member — a member's
 * optimistic row and later confirmed row must never count twice). `total`, when
 * supplied, is the audience size the leader is chasing.
 */
export function deriveCompletion(
  announcementId: string,
  acks: readonly AckRow[],
  total?: number
): AckCompletion {
  const members = new Set<string>();
  for (const a of acks) {
    if (a.announcementId === announcementId) members.add(a.profileId);
  }
  const acknowledged = members.size;
  if (total === undefined || total <= 0) return { acknowledged };
  return { acknowledged, total, ratio: Math.min(1, acknowledged / total) };
}
