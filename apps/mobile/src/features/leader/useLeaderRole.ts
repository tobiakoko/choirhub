// Resolves the signed-in leader's capabilities (roles.ts) from their scoped role
// grants. Drives which leader affordances render — the compose FAB, the Critical
// tier, member management, the coordinator roll-up. Presentational only: every
// mutation these unlock is re-checked by RLS (§5, CLAUDE.md rule #2).

import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/data/supabase';
import { useSession } from '@/features/onboarding/api';

import { capabilitiesFor, type LeaderCapabilities, type UserRoleName } from './roles';

async function fetchRoles(userId: string): Promise<UserRoleName[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('role')
    .eq('profile_id', userId)
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as UserRoleName);
}

export interface UseLeaderRole {
  capabilities: LeaderCapabilities;
  roles: UserRoleName[];
  loading: boolean;
}

const NO_ROLES: UserRoleName[] = [];

/**
 * Fetch the caller's roles and derive their leader capabilities. Cached for the
 * session (role grants rarely change mid-session). While unresolved, capabilities
 * are all-false so no leader UI flashes in for a member.
 */
export function useLeaderRole(): UseLeaderRole {
  const { session } = useSession();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: ['leader-roles', userId],
    queryFn: () => fetchRoles(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const roles = query.data ?? NO_ROLES;
  return { capabilities: capabilitiesFor(roles), roles, loading: query.isLoading };
}
