import { formatBytes, formatClock } from './format';

describe('formatBytes', () => {
  it('states MB with one decimal once past 1 MiB', () => {
    expect(formatBytes(2_949_120)).toBe('2.8 MB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });
  it('rounds KB below 1 MiB and shows bytes below 1 KB', () => {
    expect(formatBytes(716800)).toBe('700 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(512)).toBe('512 B');
  });
  it('shows an em dash for an unknown size', () => {
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(-1)).toBe('—');
  });
});

describe('formatClock', () => {
  it('renders m:ss', () => {
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(600_000)).toBe('10:00');
  });
  it('clamps unknown/negative to 0:00', () => {
    expect(formatClock(undefined)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
  });
});
