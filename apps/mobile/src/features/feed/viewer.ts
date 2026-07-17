// The viewer's scope, and the pure audience-visibility predicate that decides
// whether a targeted announcement resolves to this member (system design §4/§5).
//
// This is a *presentational* filter, not the security boundary: the sync pull is
// already RLS-filtered, so every announcement in the local DB is one the viewer
// may see (CLAUDE.md rule 2). We re-check locally so the feed can group content,
// power the category chips, and never surprise a member with an item that no
// longer targets them — but when the viewer's scope is unresolved (cold start,
// offline before first profile fetch) we defer to RLS and treat content as
// visible rather than blank the feed.

/** Targeting types that live on an `audiences` row (server: audiences.target_type). */
export type AudienceTargetType = 'all' | 'region' | 'location' | 'group' | 'voice_part';

/** One targeting row for an announcement, as mirrored locally. */
export interface AudienceRow {
  announcementId: string;
  targetType: AudienceTargetType;
  /** Scope id the row targets; absent for `all`. */
  targetId?: string | null;
}

/**
 * The current member's resolved scope. `groupIds` is the union of every group the
 * viewer belongs to — committee/sub-choir memberships *and* their voice-part group —
 * so both `group` and `voice_part` targeting resolve against one set (the client
 * never syncs the groups table, so we can't re-derive a voice part into a group id;
 * the resolver hands us the ids directly).
 */
export interface Viewer {
  profileId: string;
  regionId?: string | null;
  locationId?: string | null;
  groupIds: ReadonlySet<string>;
}

/** True when at least one of the announcement's audience rows targets the viewer. */
export function isAudienceVisible(rows: readonly AudienceRow[], viewer: Viewer): boolean {
  // No targeting rows at all → the item isn't scoped to anyone we can resolve; the
  // server already vetted it, so show it (defensive default, not a leak — see file
  // header).
  if (rows.length === 0) return true;

  return rows.some((row) => {
    switch (row.targetType) {
      case 'all':
        return true;
      case 'region':
        return !!viewer.regionId && row.targetId === viewer.regionId;
      case 'location':
        return !!viewer.locationId && row.targetId === viewer.locationId;
      case 'group':
      case 'voice_part':
        return !!row.targetId && viewer.groupIds.has(row.targetId);
      default: {
        const exhaustive: never = row.targetType;
        return exhaustive;
      }
    }
  });
}

/**
 * Keep only announcements the viewer is targeted by. `audiencesByAnnouncement`
 * maps announcement id → its audience rows. A null viewer (scope not yet resolved)
 * passes everything through — RLS remains the boundary.
 */
export function filterVisible<T extends { id: string }>(
  announcements: readonly T[],
  audiencesByAnnouncement: ReadonlyMap<string, readonly AudienceRow[]>,
  viewer: Viewer | null
): T[] {
  if (!viewer) return announcements.slice();
  return announcements.filter((a) =>
    isAudienceVisible(audiencesByAnnouncement.get(a.id) ?? [], viewer)
  );
}

/** Group a flat list of audience rows by their announcement id. */
export function groupAudiences(rows: readonly AudienceRow[]): Map<string, AudienceRow[]> {
  const byAnnouncement = new Map<string, AudienceRow[]>();
  for (const row of rows) {
    const list = byAnnouncement.get(row.announcementId);
    if (list) list.push(row);
    else byAnnouncement.set(row.announcementId, [row]);
  }
  return byAnnouncement;
}
