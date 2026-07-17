import {
  formatDayLabel,
  formatTime,
  formatTimeRange,
  monthKey,
  monthLabel,
} from './datetime';

// A +234 (Nigeria) device runs on Africa/Lagos, UTC+1 year-round (no DST).
const LAGOS = 'Africa/Lagos';
// A US device for contrast — America/New_York is UTC-4 in July (EDT).
const NEW_YORK = 'America/New_York';

describe('device-timezone conversion', () => {
  it('renders the same UTC instant at the correct local time per device zone', () => {
    const utc = '2026-07-20T18:00:00.000Z';
    // 18:00Z + 1h = 19:00 in Lagos; 18:00Z - 4h = 14:00 in New York.
    expect(formatTime(utc, LAGOS)).toBe('7:00 PM');
    expect(formatTime(utc, NEW_YORK)).toBe('2:00 PM');
  });

  it('handles the +234 offset crossing midnight into the next day', () => {
    const utc = '2026-07-20T23:30:00.000Z';
    // 23:30Z + 1h = 00:30 on Jul 21 in Lagos.
    expect(formatTime(utc, LAGOS)).toBe('12:30 AM');
    expect(formatDayLabel(utc, LAGOS)).toBe('Tue, Jul 21');
    // Same instant is still Jul 20 (19:30) in New York.
    expect(formatDayLabel(utc, NEW_YORK)).toBe('Mon, Jul 20');
  });

  it('buckets into the month the member actually sees (device tz)', () => {
    const utc = '2026-07-31T23:30:00.000Z';
    // Lagos rolls into August; New York is still July.
    expect(monthKey(utc, LAGOS)).toBe('2026-08');
    expect(monthLabel(utc, LAGOS)).toBe('August 2026');
    expect(monthKey(utc, NEW_YORK)).toBe('2026-07');
    expect(monthLabel(utc, NEW_YORK)).toBe('July 2026');
  });
});

describe('formatTimeRange', () => {
  it('collapses a shared meridiem', () => {
    expect(
      formatTimeRange('2026-07-20T18:00:00Z', '2026-07-20T20:00:00Z', LAGOS)
    ).toBe('7:00 – 9:00 PM');
  });
  it('keeps both meridiems when they differ', () => {
    expect(
      formatTimeRange('2026-07-20T10:00:00Z', '2026-07-20T12:30:00Z', LAGOS)
    ).toBe('11:00 AM – 1:30 PM');
  });
  it('shows only the start when there is no end', () => {
    expect(formatTimeRange('2026-07-20T18:00:00Z', undefined, LAGOS)).toBe('7:00 PM');
  });
});
