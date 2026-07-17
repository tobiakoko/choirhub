// Data for the compliance dashboard (§5). Campaigns and their per-member status
// are read over the network — a leader runs compliance online, and the join to
// member names/locations isn't in the local mirror. RLS scopes what comes back:
// a location leader sees only their location's rows; a coordinator sees the
// cross-location roll-up. Marking a member paid is a separate outbox write
// (useMarkPaid) so it still works offline.

import { useQuery } from '@tanstack/react-query';

import type { CampaignState } from '@/data/sync';
import { supabase } from '@/data/supabase';
import { useSession } from '@/features/onboarding/api';

import type { ComplianceRow } from './compliance';

export interface LeaderCampaign {
  id: string;
  type: 'payment' | 'task';
  title: string;
  amountCents: number | null;
  deadline: string | null;
  locationId: string | null;
  groupId: string | null;
}

interface CampaignRow {
  id: string;
  type: 'payment' | 'task';
  title: string;
  amount_cents: number | null;
  deadline: string | null;
  location_id: string | null;
  group_id: string | null;
}

async function fetchLeaderCampaigns(): Promise<LeaderCampaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, type, title, amount_cents, deadline, location_id, group_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as CampaignRow[] | null) ?? []).map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    amountCents: c.amount_cents,
    deadline: c.deadline,
    locationId: c.location_id,
    groupId: c.group_id,
  }));
}

/** Campaigns the caller can see (RLS-scoped) — the dashboard's campaign picker. */
export function useLeaderCampaigns() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['leader-campaigns', session?.user.id],
    queryFn: fetchLeaderCampaigns,
    enabled: !!session?.user.id,
  });
}

interface StatusRow {
  profile_id: string;
  status: CampaignState;
  profiles: {
    display_name: string;
    locations: { name: string } | null;
  } | null;
}

async function fetchCampaignCompliance(campaignId: string): Promise<ComplianceRow[]> {
  const { data, error } = await supabase
    .from('campaign_status')
    .select('profile_id, status, profiles(display_name, locations(name))')
    .eq('campaign_id', campaignId)
    .is('deleted_at', null);
  if (error) throw error;
  // The untyped client infers embeds as arrays; a to-one FK returns an object at
  // runtime, so cast through unknown to the real shape.
  return ((data as unknown as StatusRow[] | null) ?? []).map((r) => ({
    profileId: r.profile_id,
    memberName: r.profiles?.display_name ?? 'Member',
    status: r.status,
    locationName: r.profiles?.locations?.name ?? null,
  }));
}

/** Every member's status on one campaign (RLS-scoped). Feeds the progress bar,
 *  the pending list, and the coordinator roll-up. */
export function useCampaignCompliance(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-compliance', campaignId],
    queryFn: () => fetchCampaignCompliance(campaignId as string),
    enabled: !!campaignId,
  });
}

/** The query key useMarkPaid patches optimistically — exported so both agree. */
export function complianceQueryKey(campaignId: string): [string, string] {
  return ['campaign-compliance', campaignId];
}
