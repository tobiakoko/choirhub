import type { VocalPart } from '@choirhub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/data/supabase';

export type MembershipStatus = 'pending' | 'approved' | 'declined';

/** null status = authenticated but no profile yet (invite step not done). */
export type MembershipState = { status: MembershipStatus | null };

/** Where to reach the location leader — powers the pending-screen fallback. */
export type LeaderContact = { leaderName: string | null; leaderPhone: string | null };

export type ValidatedInvite = LeaderContact & { locationId: string; locationName: string };

// ── auth (phone OTP) ─────────────────────────────────────────────────────────

async function sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

async function verifyPhoneOtp(phone: string, token: string): Promise<Session> {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  if (!data.session) throw new Error('NOT_AUTHENTICATED');
  return data.session;
}

export function useSendOtp() {
  return useMutation({ mutationFn: (phone: string) => sendPhoneOtp(phone) });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ phone, token }: { phone: string; token: string }) =>
      verifyPhoneOtp(phone, token),
  });
}

// ── invite codes ─────────────────────────────────────────────────────────────

type InviteRow = {
  location_id: string;
  location_name: string;
  leader_name: string | null;
  leader_phone: string | null;
};

async function validateInviteCode(code: string): Promise<ValidatedInvite> {
  const { data, error } = await supabase.rpc('validate_invite_code', { p_code: code });
  if (error) throw error;
  const row = (data as InviteRow[] | null)?.[0];
  if (!row) throw new Error('INVITE_INVALID');
  return {
    locationId: row.location_id,
    locationName: row.location_name,
    leaderName: row.leader_name,
    leaderPhone: row.leader_phone,
  };
}

export type JoinInput = { code: string; displayName: string; voicePart: VocalPart | null };
export type JoinResult = LeaderContact & { status: MembershipStatus };

async function joinWithInviteCode(input: JoinInput): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_with_invite_code', {
    p_code: input.code,
    p_display_name: input.displayName,
    p_voice_part: input.voicePart,
  });
  if (error) throw error;
  const row = (data as (InviteRow & { status: MembershipStatus })[] | null)?.[0];
  return {
    status: row?.status ?? 'pending',
    leaderName: row?.leader_name ?? null,
    leaderPhone: row?.leader_phone ?? null,
  };
}

export function useValidateInviteCode() {
  return useMutation({ mutationFn: (code: string) => validateInviteCode(code) });
}

export function useJoinWithInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinInput) => joinWithInviteCode(input),
    onSuccess: (result) =>
      qc.setQueryData(['membership'], { status: result.status } satisfies MembershipState),
  });
}

// ── session ──────────────────────────────────────────────────────────────────

/** Tracks the current auth session, kept in sync with SecureStore persistence. */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

// ── membership status (+ realtime approval) ──────────────────────────────────

async function fetchMembership(userId: string): Promise<MembershipState> {
  const { data, error } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return { status: (data?.status as MembershipStatus | undefined) ?? null };
}

/**
 * The pending-approval screen's live pulse: reads the caller's own profile
 * status and subscribes to realtime UPDATEs so the moment a leader approves,
 * the app routes into the tabs — no polling, no manual refresh.
 */
export function useMembershipStatus(userId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['membership'],
    queryFn: () => fetchMembership(userId as string),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`membership:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const next = (payload.new as { status?: MembershipStatus }).status ?? null;
          qc.setQueryData(['membership'], { status: next } satisfies MembershipState);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return query;
}
