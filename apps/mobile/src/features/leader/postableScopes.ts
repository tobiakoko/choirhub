// The audiences a leader may target, as returned by the `postable_scopes` RPC
// (migration 0012). The compose Audience step renders *only* these — the client
// never invents a scope — so a leader can only offer what RLS already permits
// (§5). `member_count` is the live count of approved members each scope reaches,
// shown next to the option (spec: "live member count").

import type { AudienceTargetType } from '@/features/feed/viewer';

/** One targetable audience option + its live approved-member reach. */
export interface PostableScope {
  targetType: AudienceTargetType;
  /** Null only for the region-wide `all` scope. */
  targetId: string | null;
  label: string;
  memberCount: number;
}

/** The row shape the RPC returns (snake_case, straight off supabase-js). */
export interface PostableScopeRow {
  target_type: AudienceTargetType;
  target_id: string | null;
  label: string;
  member_count: number;
}

export function rowToScope(row: PostableScopeRow): PostableScope {
  return {
    targetType: row.target_type,
    targetId: row.target_id,
    label: row.label,
    memberCount: row.member_count,
  };
}

/** Stable identity for a scope — the selection key in compose state. `all` has no
 *  id, so it keys on the type alone. */
export function scopeKey(scope: Pick<PostableScope, 'targetType' | 'targetId'>): string {
  return `${scope.targetType}:${scope.targetId ?? 'all'}`;
}

/** Broadest → narrowest, so the Audience list reads top-down like the org chart. */
const TYPE_ORDER: Record<AudienceTargetType, number> = {
  all: 0,
  region: 1,
  location: 2,
  group: 3,
  voice_part: 4,
};

/** Order scopes broadest-first, then alphabetically by label within a tier. */
export function sortScopes(scopes: readonly PostableScope[]): PostableScope[] {
  return [...scopes].sort((a, b) => {
    const byType = TYPE_ORDER[a.targetType] - TYPE_ORDER[b.targetType];
    return byType !== 0 ? byType : a.label.localeCompare(b.label);
  });
}

/**
 * Unique members reached by a set of selected scopes. Because the same person can
 * sit in several selected scopes (their location *and* their voice-part group), a
 * naive sum double-counts; without the membership rows on the client we can only
 * bound it. We report the largest single scope as the floor and the sum as the
 * ceiling — the UI shows the floor ("reaches at least N"), which never overstates
 * reach. Returns 0 for an empty selection.
 */
export function reachBounds(selected: readonly PostableScope[]): { atLeast: number; atMost: number } {
  if (selected.length === 0) return { atLeast: 0, atMost: 0 };
  let atLeast = 0;
  let atMost = 0;
  for (const s of selected) {
    atMost += s.memberCount;
    if (s.memberCount > atLeast) atLeast = s.memberCount;
  }
  return { atLeast, atMost };
}
