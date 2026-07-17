// Shared mapping between a queued mutation and (a) its optimistic local row and
// (b) its push-wire form. Centralised here so the WatermelonDB LocalStore and the
// in-memory test fake produce identical optimistic rows, and the engine and edge
// function agree on the push shape.

import type {
  AckPayload,
  MarkPaidPayload,
  OutboxRecord,
  PullRow,
  PushMutation,
  RsvpPayload,
  SyncTableName,
} from './types';

/** The optimistic row a queued mutation writes locally so the UI updates at once
 *  (§6.1 "queued actions show success immediately"). Stored under `id = clientUuid`;
 *  the pull merge collapses it into the confirmed server row later. Returns null
 *  for mutations with no readable local mirror (form responses aren't a read model). */
export function toOptimisticRow(
  record: OutboxRecord,
  profileId: string,
  nowIso: string
): { table: SyncTableName; row: PullRow } | null {
  const base = {
    id: record.clientUuid,
    client_uuid: record.clientUuid,
    server_updated_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  switch (record.type) {
    case 'ack': {
      const p = record.payload as AckPayload;
      return {
        table: 'acknowledgments',
        row: {
          ...base,
          announcement_id: p.announcement_id,
          profile_id: profileId,
          acknowledged_at: p.acknowledged_at,
        },
      };
    }
    case 'rsvp': {
      const p = record.payload as RsvpPayload;
      return {
        table: 'rsvps',
        row: { ...base, event_id: p.event_id, profile_id: profileId, status: p.status },
      };
    }
    case 'mark_paid': {
      const p = record.payload as MarkPaidPayload;
      return {
        table: 'campaign_status',
        row: {
          ...base,
          campaign_id: p.campaign_id,
          profile_id: p.profile_id,
          status: p.status,
          marked_by: profileId,
        },
      };
    }
    case 'form_response':
      // Form responses have no read model; the form's "submitted" chip is derived
      // from the pending outbox entry, so there is no optimistic row to write.
      return null;
    default: {
      const exhaustive: never = record.type;
      return exhaustive;
    }
  }
}

/** Serialise a queued record for the push endpoint. */
export function toPushMutation(record: OutboxRecord): PushMutation {
  return { client_uuid: record.clientUuid, type: record.type, payload: record.payload };
}
