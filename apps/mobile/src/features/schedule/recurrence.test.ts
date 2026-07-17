import { describeRecurrence, expandOccurrences, parseRecurrence } from './recurrence';

const LAGOS = 'Africa/Lagos';
// 2026-07-02T18:00:00Z is a Thursday.
const THU = '2026-07-02T18:00:00.000Z';
const julyWindow = { fromIso: '2026-07-01T00:00:00.000Z', toIso: '2026-07-31T23:59:59.000Z' };

describe('parseRecurrence', () => {
  it('parses a weekly rule with interval, count, byday', () => {
    expect(parseRecurrence('FREQ=WEEKLY;INTERVAL=2;COUNT=8;BYDAY=TU,TH')).toEqual({
      freq: 'WEEKLY',
      interval: 2,
      count: 8,
      byDay: ['TU', 'TH'],
    });
  });
  it('tolerates an RRULE: prefix and lowercase', () => {
    expect(parseRecurrence('RRULE:freq=weekly')).toEqual({ freq: 'WEEKLY', interval: 1 });
  });
  it('returns null for empty or unsupported frequencies', () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence('')).toBeNull();
    expect(parseRecurrence('FREQ=MONTHLY')).toBeNull();
  });
});

describe('expandOccurrences (weekly rehearsals)', () => {
  it('strides weekly across the window', () => {
    expect(expandOccurrences(THU, 'FREQ=WEEKLY', julyWindow)).toEqual([
      '2026-07-02T18:00:00.000Z',
      '2026-07-09T18:00:00.000Z',
      '2026-07-16T18:00:00.000Z',
      '2026-07-23T18:00:00.000Z',
      '2026-07-30T18:00:00.000Z',
    ]);
  });

  it('honors COUNT', () => {
    expect(expandOccurrences(THU, 'FREQ=WEEKLY;COUNT=3', julyWindow)).toEqual([
      '2026-07-02T18:00:00.000Z',
      '2026-07-09T18:00:00.000Z',
      '2026-07-16T18:00:00.000Z',
    ]);
  });

  it('honors INTERVAL', () => {
    expect(expandOccurrences(THU, 'FREQ=WEEKLY;INTERVAL=2', julyWindow)).toEqual([
      '2026-07-02T18:00:00.000Z',
      '2026-07-16T18:00:00.000Z',
      '2026-07-30T18:00:00.000Z',
    ]);
  });

  it('stops at UNTIL', () => {
    expect(expandOccurrences(THU, 'FREQ=WEEKLY;UNTIL=20260716T000000Z', julyWindow)).toEqual([
      '2026-07-02T18:00:00.000Z',
      '2026-07-09T18:00:00.000Z',
    ]);
  });

  it('expands multiple weekdays per week with BYDAY', () => {
    const window = { fromIso: '2026-07-01T00:00:00.000Z', toIso: '2026-07-15T23:59:59.000Z' };
    expect(expandOccurrences(THU, 'FREQ=WEEKLY;BYDAY=TU,TH', window)).toEqual([
      '2026-07-02T18:00:00.000Z', // Thu (start)
      '2026-07-07T18:00:00.000Z', // Tue
      '2026-07-09T18:00:00.000Z', // Thu
      '2026-07-14T18:00:00.000Z', // Tue
    ]);
  });

  it('never emits before the event start', () => {
    // A late window still starts no earlier than the event's own first instance.
    const window = { fromIso: '2026-07-10T00:00:00.000Z', toIso: '2026-07-31T23:59:59.000Z' };
    expect(expandOccurrences(THU, 'FREQ=WEEKLY', window)[0]).toBe('2026-07-16T18:00:00.000Z');
  });

  it('treats a non-recurring event as a single in-window occurrence', () => {
    expect(expandOccurrences(THU, null, julyWindow)).toEqual(['2026-07-02T18:00:00.000Z']);
    expect(expandOccurrences('2026-09-01T18:00:00.000Z', null, julyWindow)).toEqual([]);
  });
});

describe('describeRecurrence', () => {
  it('describes weekly cadence', () => {
    expect(describeRecurrence('FREQ=WEEKLY', THU, LAGOS)).toBe('Every week on Thu');
    expect(describeRecurrence('FREQ=WEEKLY;INTERVAL=2', THU, LAGOS)).toBe('Every 2 weeks on Thu');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=TU,TH', THU, LAGOS)).toBe(
      'Every week on Tuesday, Thursday'
    );
  });
  it('describes daily cadence and empty for one-offs', () => {
    expect(describeRecurrence('FREQ=DAILY', THU, LAGOS)).toBe('Every day');
    expect(describeRecurrence(null, THU, LAGOS)).toBe('');
  });
});
