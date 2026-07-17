import {
  planRehearsalPrefetch,
  selectOwnPartAudio,
  shouldRunPrefetch,
  upcomingRehearsalEvents,
  type PrefetchAsset,
  type PrefetchEvent,
} from './rehearsalPack';

const NOW = Date.parse('2026-07-17T12:00:00.000Z');
const inHours = (h: number) => new Date(NOW + h * 3600_000).toISOString();

const events: PrefetchEvent[] = [
  { id: 'soon', startsAt: inHours(6) },
  { id: 'tomorrow', startsAt: inHours(20) },
  { id: 'next-week', startsAt: inHours(24 * 5) },
  { id: 'past', startsAt: inHours(-2) },
  { id: 'deleted', startsAt: inHours(3), deletedAt: inHours(-1) },
];

describe('upcomingRehearsalEvents', () => {
  it('keeps only non-deleted events starting within the next 24h, soonest first', () => {
    expect(upcomingRehearsalEvents(events, NOW).map((e) => e.id)).toEqual(['soon', 'tomorrow']);
  });
});

const assets: PrefetchAsset[] = [
  { id: 'a-ten', songId: 's1', assetType: 'part_audio', voicePart: 'tenor', renditions: {} },
  { id: 'a-sop', songId: 's1', assetType: 'part_audio', voicePart: 'soprano', renditions: {} },
  { id: 'a-lyr', songId: 's1', assetType: 'lyrics', voicePart: null, renditions: {} },
  { id: 'b-ten', songId: 's2', assetType: 'part_audio', voicePart: 'tenor', renditions: {} },
];

describe('selectOwnPartAudio', () => {
  it('takes only the member’s own part audio for the given songs', () => {
    const picked = selectOwnPartAudio(assets, new Set(['s1']), 'tenor');
    expect(picked.map((a) => a.id)).toEqual(['a-ten']);
  });
  it('returns nothing when the member has no voice part', () => {
    expect(selectOwnPartAudio(assets, new Set(['s1']), null)).toEqual([]);
  });
});

describe('shouldRunPrefetch', () => {
  it('runs only on Wi-Fi and charging', () => {
    expect(shouldRunPrefetch({ networkType: 'wifi', charging: true })).toBe(true);
    expect(shouldRunPrefetch({ networkType: 'wifi', charging: false })).toBe(false);
    expect(shouldRunPrefetch({ networkType: 'cellular', charging: true })).toBe(false);
  });
});

describe('planRehearsalPrefetch', () => {
  it('selects own-part audio for songs scheduled within 24h, de-duplicated', () => {
    const plan = planRehearsalPrefetch({
      events,
      assets,
      songIdsByEventId: new Map([
        ['soon', ['s1']],
        ['tomorrow', ['s2']],
        ['next-week', ['s1', 's2']], // outside the window — must not contribute
      ]),
      voicePart: 'tenor',
      now: NOW,
    });
    expect(plan.map((a) => a.id).sort()).toEqual(['a-ten', 'b-ten']);
  });

  it('is empty when nothing is scheduled soon', () => {
    expect(
      planRehearsalPrefetch({
        events: [{ id: 'past', startsAt: inHours(-2) }],
        assets,
        songIdsByEventId: new Map(),
        voicePart: 'tenor',
        now: NOW,
      })
    ).toEqual([]);
  });
});
