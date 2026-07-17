// The acknowledge action. Enqueues an `ack` light-write through the sync engine:
// the engine writes the optimistic acknowledgment row (instant ✓/🕓 on the card)
// and drains it to the server on the next sync (§6.1). Safe offline — the write
// waits in the outbox and the pill shows 🕓 until it lands.

import { useCallback } from 'react';

import { getSyncEngine } from '@/data/sync';
import { uuidv4 } from '@/data/uuid';

export function useAck(): (announcementId: string) => Promise<unknown> {
  return useCallback(
    (announcementId: string) =>
      getSyncEngine().enqueue({
        clientUuid: uuidv4(),
        type: 'ack',
        payload: {
          announcement_id: announcementId,
          acknowledged_at: new Date().toISOString(),
        },
      }),
    []
  );
}
