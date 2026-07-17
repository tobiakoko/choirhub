import { buildAgenda, defaultWindow, flattenAgenda, type ScheduleEvent } from './agenda';

const LAGOS = 'Africa/Lagos';

const weekly: ScheduleEvent = {
  id: 'a',
  title: 'Regional Rehearsal',
  startsAt: '2026-07-02T18:00:00.000Z',
  endsAt: '2026-07-02T20:00:00.000Z',
  recurrenceRule: 'FREQ=WEEKLY;COUNT=2',
};
const single: ScheduleEvent = {
  id: 'b',
  title: 'Concert',
  startsAt: '2026-08-05T17:00:00.000Z',
};

const window = { fromIso: '2026-07-01T00:00:00.000Z', toIso: '2026-08-31T23:59:59.000Z' };

describe('buildAgenda', () => {
  it('expands, sorts, and groups occurrences into month sections', () => {
    const sections = buildAgenda([weekly, single], window, LAGOS);
    expect(sections.map((s) => s.key)).toEqual(['2026-07', '2026-08']);
    expect(sections.map((s) => s.label)).toEqual(['July 2026', 'August 2026']);
    expect(sections[0].items.map((o) => o.startIso)).toEqual([
      '2026-07-02T18:00:00.000Z',
      '2026-07-09T18:00:00.000Z',
    ]);
    expect(sections[1].items.map((o) => o.event.id)).toEqual(['b']);
  });

  it('preserves each recurring occurrence’s duration on its end time', () => {
    const [july] = buildAgenda([weekly], window, LAGOS);
    // Second occurrence: start shifted by a week, end still start + 2h.
    expect(july.items[1].startIso).toBe('2026-07-09T18:00:00.000Z');
    expect(july.items[1].endIso).toBe('2026-07-09T20:00:00.000Z');
  });

  it('keys occurrences uniquely by event + start', () => {
    const [july] = buildAgenda([weekly], window, LAGOS);
    expect(july.items[0].key).toBe('a:2026-07-02T18:00:00.000Z');
    expect(july.items[1].key).toBe('a:2026-07-09T18:00:00.000Z');
  });
});

describe('flattenAgenda', () => {
  it('interleaves month headers and event rows', () => {
    const rows = flattenAgenda(buildAgenda([weekly, single], window, LAGOS));
    expect(rows.map((r) => (r.type === 'month' ? `#${r.label}` : r.occurrence.event.id))).toEqual([
      '#July 2026',
      'a',
      'a',
      '#August 2026',
      'b',
    ]);
  });
});

describe('defaultWindow', () => {
  it('spans from the start of today out the given number of days', () => {
    const now = new Date('2026-07-17T15:30:00.000Z');
    const w = defaultWindow(now, 30);
    expect(new Date(w.fromIso).getTime()).toBeLessThanOrEqual(now.getTime());
    const spanDays = (new Date(w.toIso).getTime() - new Date(w.fromIso).getTime()) / 86400000;
    expect(spanDays).toBe(30);
  });
});
