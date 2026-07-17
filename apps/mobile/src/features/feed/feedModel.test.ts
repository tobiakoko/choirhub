import {
  applyCategoryFilter,
  buildFeedRows,
  buildSections,
  deriveAction,
  flattenSections,
  isStale,
  stripeCategory,
} from './feedModel';
import type { FeedAnnouncement } from './feedModel';

const ann = (over: Partial<FeedAnnouncement> & { id: string }): FeedAnnouncement => ({
  authorId: 'author',
  category: 'rehearsal',
  priority: 'normal',
  pinned: false,
  requiresAck: false,
  title: `Title ${over.id}`,
  body: 'body',
  publishAt: '2026-07-17T10:00:00.000Z',
  ...over,
});

describe('deriveAction', () => {
  it('is an acknowledge action when the announcement requires ack', () => {
    expect(deriveAction(ann({ id: '1', requiresAck: true }))).toEqual({ kind: 'acknowledge' });
  });
  it('is null when no ack is required', () => {
    expect(deriveAction(ann({ id: '1', requiresAck: false }))).toBeNull();
  });
});

describe('stripeCategory', () => {
  it('uses the announcement category', () => {
    expect(stripeCategory(ann({ id: '1', category: 'payment' }))).toBe('payment');
  });
  it('overrides to critical when priority is critical', () => {
    expect(stripeCategory(ann({ id: '1', category: 'payment', priority: 'critical' }))).toBe(
      'critical'
    );
  });
});

describe('applyCategoryFilter', () => {
  const items = [
    ann({ id: '1', category: 'rehearsal' }),
    ann({ id: '2', category: 'payment' }),
    ann({ id: '3', category: 'payment', priority: 'critical' }),
  ];

  it('passes everything through for `all`', () => {
    expect(applyCategoryFilter(items, 'all')).toHaveLength(3);
  });
  it('keeps only the chosen category', () => {
    expect(applyCategoryFilter(items, 'payment').map((a) => a.id)).toEqual(['2', '3']);
  });
  it('treats critical-priority items as members of the critical chip', () => {
    expect(applyCategoryFilter(items, 'critical').map((a) => a.id)).toEqual(['3']);
  });
});

describe('buildSections', () => {
  it('splits pinned from recent, each newest-first, dropping empties', () => {
    const items = [
      ann({ id: 'old', publishAt: '2026-07-10T10:00:00.000Z' }),
      ann({ id: 'pin', pinned: true, publishAt: '2026-07-01T10:00:00.000Z' }),
      ann({ id: 'new', publishAt: '2026-07-17T10:00:00.000Z' }),
    ];
    const sections = buildSections(items);
    expect(sections.map((s) => s.key)).toEqual(['pinned', 'recent']);
    expect(sections[0].items.map((a) => a.id)).toEqual(['pin']);
    expect(sections[1].items.map((a) => a.id)).toEqual(['new', 'old']);
  });

  it('omits the pinned section entirely when nothing is pinned', () => {
    const sections = buildSections([ann({ id: '1' })]);
    expect(sections.map((s) => s.key)).toEqual(['recent']);
  });

  it('returns no sections for an empty feed', () => {
    expect(buildSections([])).toEqual([]);
  });
});

describe('flattenSections / buildFeedRows', () => {
  it('interleaves section headers and announcement rows with stable keys', () => {
    const rows = flattenSections(
      buildSections([ann({ id: 'pin', pinned: true }), ann({ id: 'a' })])
    );
    expect(rows.map((r) => (r.type === 'section' ? `#${r.title}` : r.key))).toEqual([
      '#Pinned',
      'ann:pin',
      '#Recent',
      'ann:a',
    ]);
  });

  it('buildFeedRows filters then sections then flattens', () => {
    const items = [
      ann({ id: 'r', category: 'rehearsal' }),
      ann({ id: 'p', category: 'payment' }),
    ];
    const rows = buildFeedRows(items, 'payment');
    const annKeys = rows.filter((r) => r.type === 'announcement').map((r) => r.key);
    expect(annKeys).toEqual(['ann:p']);
  });
});

describe('isStale', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');
  it('is stale when never synced', () => {
    expect(isStale(null, now)).toBe(true);
  });
  it('is fresh within the threshold', () => {
    expect(isStale('2026-07-17T11:55:00.000Z', now)).toBe(false);
  });
  it('is stale past the threshold', () => {
    expect(isStale('2026-07-17T11:00:00.000Z', now)).toBe(true);
  });
});
