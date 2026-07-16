import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/data/supabase';

/**
 * Leader-side join approval data layer. The approval *UI* lands in Session 8;
 * this is the hook it will consume. Reads pending members in a location and
 * drives the approve/decline RPCs (0010 migration), whose authority is enforced
 * in Postgres — the client only offers what the leader's role permits (§5).
 */

export type PendingMember = {
  id: string;
  displayName: string;
  voicePart: 'soprano' | 'alto' | 'tenor' | 'bass' | null;
  phone: string | null;
  createdAt: string;
};

async function fetchPendingMembers(locationId: string): Promise<PendingMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, voice_part, phone, created_at')
    .eq('location_id', locationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    displayName: r.display_name as string,
    voicePart: (r.voice_part as PendingMember['voicePart']) ?? null,
    phone: (r.phone as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

export function usePendingMembers(locationId: string | undefined) {
  return useQuery({
    queryKey: ['pending-members', locationId],
    queryFn: () => fetchPendingMembers(locationId as string),
    enabled: !!locationId,
  });
}

async function approveMember(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_member', { p_profile_id: profileId });
  if (error) throw error;
}

async function declineMember(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('decline_member', { p_profile_id: profileId });
  if (error) throw error;
}

/** Approve a pending member: flips them to approved and grants the member role. */
export function useApproveMember(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => approveMember(profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-members', locationId] }),
  });
}

/** Decline a pending member (kept as an audit trail; they gain no access). */
export function useDeclineMember(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => declineMember(profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-members', locationId] }),
  });
}
