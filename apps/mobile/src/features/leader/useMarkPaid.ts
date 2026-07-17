// Mark a member paid/complete on a campaign. This is an offline-safe light-write
// (§6.1): it queues a `mark_paid` mutation in the outbox with a client UUID, so it
// succeeds instantly on the card (the glide-out animation) and drains to the
// server on the next sync. Authority is re-proven server-side — the
// campaign_status insert/update policy confines a leader to their own location
// (§5) — so a queued out-of-scope mark is rejected on push, never applied.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { CampaignState } from '@/data/sync';
import { getSyncEngine } from '@/data/sync';
import { uuidv4 } from '@/data/uuid';

import type { ComplianceRow } from './compliance';
import { complianceQueryKey } from './useCompliance';

export interface MarkPaidInput {
  campaignId: string;
  profileId: string;
  /** Defaults to 'complete'; 'exempt' waives a member (spec: exempt state). */
  status?: Extract<CampaignState, 'complete' | 'exempt'>;
}

/**
 * Returns a stable `markPaid` callback plus the mutation state. Optimistically
 * flips the member's row in the cached compliance list so the pending list glides
 * them out immediately, then enqueues the durable outbox write.
 */
export function useMarkPaid() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: MarkPaidInput) =>
      getSyncEngine().enqueue({
        clientUuid: uuidv4(),
        type: 'mark_paid',
        payload: {
          campaign_id: input.campaignId,
          profile_id: input.profileId,
          status: input.status ?? 'complete',
        },
      }),
    onMutate: (input) => {
      const key = complianceQueryKey(input.campaignId);
      const next = input.status ?? 'complete';
      qc.setQueryData<ComplianceRow[]>(key, (rows) =>
        rows?.map((r) => (r.profileId === input.profileId ? { ...r, status: next } : r))
      );
    },
  });

  const markPaid = useCallback(
    (input: MarkPaidInput) => mutation.mutate(input),
    [mutation]
  );

  return { markPaid, pending: mutation.isPending };
}
