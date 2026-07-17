import {
  clampTextScale,
  formatScale,
  fractionFromScale,
  scaleFromFraction,
  snapTextScale,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
} from './textScale';

describe('clampTextScale', () => {
  it('holds the value within 1.0–1.8×', () => {
    expect(clampTextScale(0.5)).toBe(TEXT_SCALE_MIN);
    expect(clampTextScale(3)).toBe(TEXT_SCALE_MAX);
    expect(clampTextScale(1.4)).toBe(1.4);
    expect(clampTextScale(Number.NaN)).toBe(TEXT_SCALE_MIN);
  });
});

describe('snapTextScale', () => {
  it('snaps to 0.1× notches without float drift', () => {
    expect(snapTextScale(1.34)).toBe(1.3);
    expect(snapTextScale(1.36)).toBe(1.4);
  });
});

describe('scaleFromFraction / fractionFromScale', () => {
  it('maps the slider ends to 1.0× and 1.8×', () => {
    expect(scaleFromFraction(0)).toBe(1.0);
    expect(scaleFromFraction(1)).toBe(1.8);
    expect(scaleFromFraction(0.5)).toBe(1.4);
  });
  it('round-trips a scale through its fraction', () => {
    expect(fractionFromScale(1.0)).toBe(0);
    expect(fractionFromScale(1.8)).toBeCloseTo(1);
    expect(scaleFromFraction(fractionFromScale(1.4))).toBe(1.4);
  });
});

describe('formatScale', () => {
  it('renders a one-decimal multiplier', () => {
    expect(formatScale(1)).toBe('1.0×');
    expect(formatScale(1.4)).toBe('1.4×');
  });
});
