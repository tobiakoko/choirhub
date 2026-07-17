// The feed's view-model layer: turns synced announcement rows into the sectioned,
// filtered, flattened list the FlatList renders. All pure — the data hook feeds it
// live WatermelonDB rows, tests feed it plain objects.

import type { Category } from '@choirhub/ui';

/** The announcement shape the feed operates on (structural — a WatermelonDB model
 *  satisfies it, so do test fixtures). */
export interface FeedAnnouncement {
  id: string;
  authorId: string;
  /** Resolved poster name when available; the card falls back to the category label. */
  authorName?: string | null;
  category: string;
  priority: string;
  pinned: boolean;
  requiresAck: boolean;
  title: string;
  body: string;
  publishAt: string;
}

/** The on-card action row variants (design system §7.1 anatomy). Announcements
 *  drive `acknowledge`; the event/form variants are here so the card's action row
 *  is complete and reusable as those features feed the same list. */
export type CardAction =
  | { kind: 'acknowledge' }
  | { kind: 'join_zoom'; url: string }
  | { kind: 'rsvp'; eventId: string }
  | { kind: 'fill_form'; formId: string };

/** The single on-card action for an announcement, or null when none is required. */
export function deriveAction(a: FeedAnnouncement): CardAction | null {
  return a.requiresAck ? { kind: 'acknowledge' } : null;
}

// ── category filter chips ────────────────────────────────────────────────────

/** A chip value: a real category, or the `all` pseudo-category. */
export type CategoryFilter = Category | 'all';

/** Chips shown in the filter row, in display order. `all` leads. */
export const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'payment', label: 'Payment' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'forms', label: 'Forms' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'critical', label: 'Critical' },
];

/** Human label for a category value (used in the card header fallback). */
export function categoryLabel(value: string): string {
  const found = CATEGORY_FILTERS.find((c) => c.value === value);
  return found ? found.label : value;
}

/** A `critical` priority overrides the category stripe to rose (system design §4). */
export function stripeCategory(a: FeedAnnouncement): Category {
  if (a.priority === 'critical') return 'critical';
  return (a.category as Category) ?? 'devotional';
}

/** Keep only announcements in the chosen category. `all` passes everything. */
export function applyCategoryFilter(
  announcements: readonly FeedAnnouncement[],
  filter: CategoryFilter
): FeedAnnouncement[] {
  if (filter === 'all') return announcements.slice();
  return announcements.filter((a) =>
    filter === 'critical' ? a.priority === 'critical' || a.category === 'critical' : a.category === filter
  );
}

// ── sectioning: pinned first, then the reverse-chronological stream ──────────

/** Newest first by publish time. */
function byPublishDesc(a: FeedAnnouncement, b: FeedAnnouncement): number {
  return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime();
}

export interface FeedSection {
  key: string;
  title: string;
  items: FeedAnnouncement[];
}

/**
 * Split into a "Pinned" section and a "Recent" section, each newest-first. Empty
 * sections are dropped so the list never renders a dangling header.
 */
export function buildSections(announcements: readonly FeedAnnouncement[]): FeedSection[] {
  const pinned: FeedAnnouncement[] = [];
  const recent: FeedAnnouncement[] = [];
  for (const a of announcements) (a.pinned ? pinned : recent).push(a);

  pinned.sort(byPublishDesc);
  recent.sort(byPublishDesc);

  const sections: FeedSection[] = [];
  if (pinned.length > 0) sections.push({ key: 'pinned', title: 'Pinned', items: pinned });
  if (recent.length > 0) sections.push({ key: 'recent', title: 'Recent', items: recent });
  return sections;
}

// ── flatten to a single virtualized list (one FlatList beats nested lists) ────

export type FeedRow =
  | { type: 'section'; key: string; title: string }
  | { type: 'announcement'; key: string; announcement: FeedAnnouncement };

/** Interleave section headers and announcement rows into one flat, keyed array. */
export function flattenSections(sections: readonly FeedSection[]): FeedRow[] {
  const rows: FeedRow[] = [];
  for (const section of sections) {
    rows.push({ type: 'section', key: `section:${section.key}`, title: section.title });
    for (const a of section.items) {
      rows.push({ type: 'announcement', key: `ann:${a.id}`, announcement: a });
    }
  }
  return rows;
}

/** Convenience: filter → visible-scope is applied upstream → sections → flat rows. */
export function buildFeedRows(
  announcements: readonly FeedAnnouncement[],
  filter: CategoryFilter
): FeedRow[] {
  return flattenSections(buildSections(applyCategoryFilter(announcements, filter)));
}

// ── staleness (drives the offline/sync pill) ─────────────────────────────────

/** Default: content older than 15 min without a sync is "stale". */
export const STALE_AFTER_MS = 15 * 60 * 1000;

/** True when we should surface the stale-data pill (§6.1). */
export function isStale(
  lastSyncedAt: string | null,
  now: Date = new Date(),
  thresholdMs: number = STALE_AFTER_MS
): boolean {
  if (!lastSyncedAt) return true;
  return now.getTime() - new Date(lastSyncedAt).getTime() > thresholdMs;
}
