import { filterVisible, groupAudiences, isAudienceVisible } from './viewer';
import type { AudienceRow, Viewer } from './viewer';

const viewer: Viewer = {
  profileId: 'me',
  regionId: 'region-1',
  locationId: 'loc-1',
  groupIds: new Set(['grp-tenor', 'grp-media']),
};

const row = (targetType: AudienceRow['targetType'], targetId?: string): AudienceRow => ({
  announcementId: 'ann-1',
  targetType,
  targetId: targetId ?? null,
});

describe('isAudienceVisible', () => {
  it('shows an `all`-targeted announcement to everyone', () => {
    expect(isAudienceVisible([row('all')], viewer)).toBe(true);
  });

  it('matches on region / location by id', () => {
    expect(isAudienceVisible([row('region', 'region-1')], viewer)).toBe(true);
    expect(isAudienceVisible([row('region', 'region-9')], viewer)).toBe(false);
    expect(isAudienceVisible([row('location', 'loc-1')], viewer)).toBe(true);
    expect(isAudienceVisible([row('location', 'loc-9')], viewer)).toBe(false);
  });

  it('matches group and voice_part targeting against the unified group set', () => {
    expect(isAudienceVisible([row('group', 'grp-media')], viewer)).toBe(true);
    expect(isAudienceVisible([row('voice_part', 'grp-tenor')], viewer)).toBe(true);
    expect(isAudienceVisible([row('voice_part', 'grp-soprano')], viewer)).toBe(false);
  });

  it('is visible when ANY row matches (OR across targeting rows)', () => {
    const rows = [row('location', 'loc-9'), row('voice_part', 'grp-tenor')];
    expect(isAudienceVisible(rows, viewer)).toBe(true);
  });

  it('defers to RLS (shows) when there are no targeting rows', () => {
    expect(isAudienceVisible([], viewer)).toBe(true);
  });

  it('does not match region/location when the viewer scope is missing', () => {
    const scopeless: Viewer = { profileId: 'me', groupIds: new Set() };
    expect(isAudienceVisible([row('region', 'region-1')], scopeless)).toBe(false);
    expect(isAudienceVisible([row('location', 'loc-1')], scopeless)).toBe(false);
  });
});

describe('filterVisible', () => {
  const anns = [{ id: 'ann-1' }, { id: 'ann-2' }, { id: 'ann-3' }];
  const audiences = groupAudiences([
    { announcementId: 'ann-1', targetType: 'all' },
    { announcementId: 'ann-2', targetType: 'location', targetId: 'loc-9' },
    { announcementId: 'ann-3', targetType: 'voice_part', targetId: 'grp-tenor' },
  ]);

  it('keeps only announcements the viewer is targeted by', () => {
    expect(filterVisible(anns, audiences, viewer).map((a) => a.id)).toEqual(['ann-1', 'ann-3']);
  });

  it('passes everything through when the viewer is unresolved (null)', () => {
    expect(filterVisible(anns, audiences, null)).toHaveLength(3);
  });

  it('treats an announcement with no audience rows as visible', () => {
    const orphan = [{ id: 'ann-x' }];
    expect(filterVisible(orphan, new Map(), viewer).map((a) => a.id)).toEqual(['ann-x']);
  });
});

describe('groupAudiences', () => {
  it('buckets rows by announcement id', () => {
    const grouped = groupAudiences([
      { announcementId: 'a', targetType: 'all' },
      { announcementId: 'a', targetType: 'location', targetId: 'loc-1' },
      { announcementId: 'b', targetType: 'region', targetId: 'region-1' },
    ]);
    expect(grouped.get('a')).toHaveLength(2);
    expect(grouped.get('b')).toHaveLength(1);
  });
});
