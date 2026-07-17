import { firstName, greeting, lastUpdatedLabel, timeAgo } from './format';

describe('timeAgo', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');
  it('renders coarse buckets', () => {
    expect(timeAgo('2026-07-17T11:59:40.000Z', now)).toBe('just now');
    expect(timeAgo('2026-07-17T11:55:00.000Z', now)).toBe('5m ago');
    expect(timeAgo('2026-07-17T10:00:00.000Z', now)).toBe('2h ago');
    expect(timeAgo('2026-07-14T12:00:00.000Z', now)).toBe('3d ago');
  });
  it('returns empty string for an unparseable timestamp', () => {
    expect(timeAgo('not-a-date', now)).toBe('');
  });
});

describe('lastUpdatedLabel', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');
  it('describes the last sync', () => {
    expect(lastUpdatedLabel('2026-07-17T10:00:00.000Z', now)).toBe('Last updated 2h ago');
  });
  it('handles the never-synced state', () => {
    expect(lastUpdatedLabel(null, now)).toBe('Not synced yet');
  });
});

describe('greeting', () => {
  it('varies by time of day', () => {
    expect(greeting(new Date('2026-07-17T08:00:00'))).toBe('Good morning');
    expect(greeting(new Date('2026-07-17T14:00:00'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-07-17T20:00:00'))).toBe('Good evening');
  });
});

describe('firstName', () => {
  it('takes the first token', () => {
    expect(firstName('Ada Lovelace')).toBe('Ada');
    expect(firstName('  Grace  ')).toBe('Grace');
    expect(firstName('')).toBe('');
  });
});
