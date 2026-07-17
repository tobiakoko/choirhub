// Fetches the audiences the caller may target from the `postable_scopes` RPC
// (migration 0012). The compose Audience step renders only these, so the UI can
// only offer what RLS already permits (§5). Live member counts come back with each
// scope. Kept behind TanStack Query so re-opening the sheet is instant.

import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/data/supabase';
import { useSession } from '@/features/onboarding/api';

import {
  type PostableScope,
  type PostableScopeRow,
  rowToScope,
  sortScopes,
} from './postableScopes';

async function fetchPostableScopes(): Promise<PostableScope[]> {
  const { data, error } = await supabase.rpc('postable_scopes');
  if (error) throw error;
  return sortScopes(((data as PostableScopeRow[] | null) ?? []).map(rowToScope));
}

export interface UsePostableScopes {
  scopes: PostableScope[];
  loading: boolean;
  error: unknown;
}

/** The targetable audiences for the compose sheet. Short stale time so a scope's
 *  member count stays reasonably fresh without refetching on every keystroke. */
export function usePostableScopes(enabled = true): UsePostableScopes {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ['postable-scopes', session?.user.id],
    queryFn: fetchPostableScopes,
    enabled: enabled && !!session?.user.id,
    staleTime: 60 * 1000,
  });
  return { scopes: query.data ?? [], loading: query.isLoading, error: query.error };
}
