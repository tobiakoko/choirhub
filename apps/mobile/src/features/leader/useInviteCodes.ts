// Invite-code management for member onboarding (§5). A location leader mints a
// location-scoped, expiring, revocable code (react-native-qrcode-svg renders it
// for scanning). Every write is RLS-gated: invite_codes policies require
// can_target(location) and created_by = auth.uid(), so a leader can only mint /
// revoke codes for a location they lead — the client scoping is a mirror of that.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/data/supabase';
import { useSession } from '@/features/onboarding/api';

import { defaultInviteExpiry, generateInviteCode, type InviteCodeView } from './invites';

interface InviteCodeRow {
  id: string;
  code: string;
  expires_at: string;
  max_uses: number;
  uses: number;
  revoked_at: string | null;
}

export interface InviteCode extends InviteCodeView {
  id: string;
}

async function fetchInviteCodes(locationId: string): Promise<InviteCode[]> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, code, expires_at, max_uses, uses, revoked_at')
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as InviteCodeRow[] | null) ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    expiresAt: r.expires_at,
    maxUses: r.max_uses,
    uses: r.uses,
    revokedAt: r.revoked_at,
  }));
}

export function useInviteCodes(locationId: string | undefined) {
  return useQuery({
    queryKey: ['invite-codes', locationId],
    queryFn: () => fetchInviteCodes(locationId as string),
    enabled: !!locationId,
  });
}

export interface GenerateInviteInput {
  locationId: string;
  /** How many members may redeem this code; defaults to the table default (25). */
  maxUses?: number;
}

async function createInviteCode(
  input: GenerateInviteInput,
  createdBy: string
): Promise<InviteCode> {
  const code = generateInviteCode();
  const { data, error } = await supabase
    .from('invite_codes')
    .insert({
      code,
      location_id: input.locationId,
      created_by: createdBy,
      expires_at: defaultInviteExpiry(),
      ...(input.maxUses ? { max_uses: input.maxUses } : {}),
    })
    .select('id, code, expires_at, max_uses, uses, revoked_at')
    .single<InviteCodeRow>();
  if (error) throw error;
  return {
    id: data.id,
    code: data.code,
    expiresAt: data.expires_at,
    maxUses: data.max_uses,
    uses: data.uses,
    revokedAt: data.revoked_at,
  };
}

/** Mint a fresh location-scoped code. Server RLS confirms the leader's authority. */
export function useGenerateInviteCode(locationId: string | undefined) {
  const qc = useQueryClient();
  const { session } = useSession();
  const createdBy = session?.user.id;
  return useMutation({
    mutationFn: (input: GenerateInviteInput) => {
      if (!createdBy) throw new Error('NOT_AUTHENTICATED');
      return createInviteCode(input, createdBy);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite-codes', locationId] }),
  });
}

async function revokeInviteCode(id: string): Promise<void> {
  const { error } = await supabase
    .from('invite_codes')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Revoke a code so it can no longer be redeemed (§5 "revocable"). */
export function useRevokeInviteCode(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInviteCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite-codes', locationId] }),
  });
}
