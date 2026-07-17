// The "remind pending only" action (§6.3 deadline escalation). Calls the
// remind_pending_members RPC, which authorizes the request server-side (the
// campaign must be one the caller manages) and returns how many still-pending
// members it targets; the actual push/SMS is emitted by the notification pipeline.
// Requires the network — reminders aren't an offline action.

import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/data/supabase';

async function remindPending(campaignId: string): Promise<number> {
  const { data, error } = await supabase.rpc('remind_pending_members', {
    p_campaign_id: campaignId,
  });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

/** Reminds every member still pending on a campaign; resolves to the count nudged. */
export function useRemindPending() {
  return useMutation({ mutationFn: (campaignId: string) => remindPending(campaignId) });
}
