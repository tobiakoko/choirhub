import { formatHour, stepHour, MUTABLE_CATEGORIES } from './format';

describe('formatHour', () => {
  it('renders a 12-hour clock with AM/PM', () => {
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(1)).toBe('1 AM');
    expect(formatHour(11)).toBe('11 AM');
    expect(formatHour(12)).toBe('12 PM');
    expect(formatHour(13)).toBe('1 PM');
    expect(formatHour(20)).toBe('8 PM');
    expect(formatHour(23)).toBe('11 PM');
  });
});

describe('stepHour', () => {
  it('wraps around the 24-hour clock', () => {
    expect(stepHour(23, 1)).toBe(0);
    expect(stepHour(0, -1)).toBe(23);
    expect(stepHour(8, 1)).toBe(9);
  });
});

describe('MUTABLE_CATEGORIES', () => {
  it('never offers Critical as mutable (§6.3)', () => {
    expect(MUTABLE_CATEGORIES).not.toContain('critical');
  });
});
