// Pull-side reconciliation. Given the local rows for a table and the incoming
// delta, decide what to upsert and what to tombstone. The rules (§6.1):
//
//   1. Last-write-wins by `updated_at` — a newer server row overwrites a stale
//      local one; an older/equal server row for an already-present record with a
//      newer local copy is ignored.
//   2. Queued writes are protected. A row whose `client_uuid` is still pending in
//      the outbox is never overwritten or deleted by the pull — the member's
//      optimistic ack/RSVP/mark-paid stays put until its own push confirms it.
//      This is what stops a delta from clobbering a local write made while offline.
//   3. Confirmed writes collapse. Optimistic rows are stored under `id = client_uuid`;
//      once the server echoes that write back (same `client_uuid`, its own real
//      `id`) and it is no longer protected, the placeholder is dropped so the
//      confirmed server row takes its place — no duplicates.
//
// Pure and synchronous so it is trivially unit-testable without a database.

import type { PullRow } from './types';

export interface ReconcileResult {
  upserts: PullRow[];
  deletedIds: string[];
}

export interface ReconcileOptions {
  /** Client UUIDs still queued locally — their rows are untouchable. */
  protectedUuids: Set<string>;
}

const clientUuidOf = (row: PullRow): string | undefined =>
  typeof row.client_uuid === 'string' ? row.client_uuid : undefined;

const isTombstone = (row: PullRow): boolean => row.deleted_at != null;

/** ISO-8601 UTC timestamps sort lexicographically = chronologically. */
const isNewer = (incoming: PullRow, local: PullRow): boolean =>
  incoming.updated_at > local.updated_at;

export function reconcile(
  local: PullRow[],
  incoming: PullRow[],
  { protectedUuids }: ReconcileOptions
): ReconcileResult {
  const localById = new Map(local.map((r) => [r.id, r]));
  // Optimistic placeholders indexed by their client_uuid, so a confirmed server
  // row can find and replace the local row it originated from.
  const localByUuid = new Map<string, PullRow>();
  for (const r of local) {
    const uuid = clientUuidOf(r);
    if (uuid) localByUuid.set(uuid, r);
  }

  const upserts: PullRow[] = [];
  const deletedIds = new Set<string>();

  for (const row of incoming) {
    const incomingUuid = clientUuidOf(row);

    // Rule 2: skip anything the outbox is still holding — by the incoming row's
    // own client_uuid, or by the local row it would replace.
    if (incomingUuid && protectedUuids.has(incomingUuid)) continue;
    const existing = localById.get(row.id);
    if (existing) {
      const existingUuid = clientUuidOf(existing);
      if (existingUuid && protectedUuids.has(existingUuid)) continue;
    }

    if (isTombstone(row)) {
      if (existing) deletedIds.add(row.id);
      continue;
    }

    // Rule 1: LWW.
    if (!existing || isNewer(row, existing)) {
      upserts.push(row);
      // Rule 3: collapse the optimistic placeholder this write came from.
      if (incomingUuid) {
        const placeholder = localByUuid.get(incomingUuid);
        if (placeholder && placeholder.id !== row.id) deletedIds.add(placeholder.id);
      }
    }
  }

  // A row can't be both upserted and deleted in the same pass.
  const upsertIds = new Set(upserts.map((r) => r.id));
  return {
    upserts,
    deletedIds: [...deletedIds].filter((id) => !upsertIds.has(id)),
  };
}
