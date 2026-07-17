// The RSVP action. Enqueues an `rsvp` light-write through the sync engine, which
// writes the optimistic rsvp row (instant selection, 🕓 while offline) and drains
// it on the next sync (§6.1). Re-tapping a different answer offline just queues
// another intent; the newest wins (rsvpState.ts).

import { useCallback } from 'react';

import { getSyncEngine } from '@/data/sync';
import { uuidv4 } from '@/data/uuid';

import type { RsvpStatus } from './rsvpState';

export function useRsvp(): (eventId: string, status: RsvpStatus) => Promise<unknown> {
  return useCallback(
    (eventId: string, status: RsvpStatus) =>
      getSyncEngine().enqueue({
        clientUuid: uuidv4(),
        type: 'rsvp',
        payload: { event_id: eventId, status },
      }),
    []
  );
}
