// The current viewer for the feed screen: identity + scope + leader flag. Wraps
// the auth session and the cached profile fetch so components can read a single
// hook. Everything downstream degrades gracefully when this is still resolving —
// the feed renders from local data regardless.

import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/onboarding/api';

import { fetchViewer, type ResolvedViewer } from './api';

export interface UseViewer {
  resolved: ResolvedViewer | null;
  loading: boolean;
}

/**
 * Resolve the signed-in member. Cached for the session (scope rarely changes);
 * on failure the query returns nothing and the feed falls back to RLS-only
 * visibility. `setSyncProfileId` is handled at app init, not here.
 */
export function useViewer(): UseViewer {
  const { session } = useSession();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: ['feed-viewer', userId],
    queryFn: () => fetchViewer(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return { resolved: query.data ?? null, loading: query.isLoading };
}
