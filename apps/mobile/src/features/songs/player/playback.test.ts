import {
  cycleAbLoop,
  EMPTY_LOOP,
  isLooping,
  loopSeekTarget,
  nextSpeed,
  positionForFraction,
  progressFraction,
} from './playback';

describe('nextSpeed', () => {
  it('cycles 0.5 → 0.75 → 1 → 0.5', () => {
    expect(nextSpeed(0.5)).toBe(0.75);
    expect(nextSpeed(0.75)).toBe(1);
    expect(nextSpeed(1)).toBe(0.5);
  });
});

describe('progressFraction', () => {
  it('is the elapsed ratio, clamped to [0,1]', () => {
    expect(progressFraction(30_000, 120_000)).toBe(0.25);
    expect(progressFraction(200_000, 120_000)).toBe(1);
    expect(progressFraction(-5, 120_000)).toBe(0);
  });
  it('is 0 for an unknown/zero duration', () => {
    expect(progressFraction(1000, undefined)).toBe(0);
    expect(progressFraction(1000, 0)).toBe(0);
  });
});

describe('positionForFraction', () => {
  it('maps a bar fraction back to a millisecond position', () => {
    expect(positionForFraction(0.5, 120_000)).toBe(60_000);
    expect(positionForFraction(1.5, 120_000)).toBe(120_000);
    expect(positionForFraction(0.5, undefined)).toBe(0);
  });
});

describe('cycleAbLoop', () => {
  it('sets A, then B, then clears', () => {
    const a = cycleAbLoop(EMPTY_LOOP, 5_000);
    expect(a).toEqual({ a: 5_000, b: null });
    const b = cycleAbLoop(a, 12_000);
    expect(b).toEqual({ a: 5_000, b: 12_000 });
    expect(cycleAbLoop(b, 20_000)).toEqual({ a: null, b: null });
  });

  it('resets A instead of setting a B that precedes it', () => {
    const a = cycleAbLoop(EMPTY_LOOP, 10_000);
    expect(cycleAbLoop(a, 4_000)).toEqual({ a: 4_000, b: null });
  });
});

describe('loopSeekTarget', () => {
  it('seeks back to A once playback reaches B', () => {
    expect(loopSeekTarget(12_000, { a: 5_000, b: 12_000 })).toBe(5_000);
    expect(loopSeekTarget(15_000, { a: 5_000, b: 12_000 })).toBe(5_000);
  });
  it('does not seek before B or with an incomplete loop', () => {
    expect(loopSeekTarget(8_000, { a: 5_000, b: 12_000 })).toBeNull();
    expect(loopSeekTarget(8_000, { a: 5_000, b: null })).toBeNull();
    expect(loopSeekTarget(8_000, EMPTY_LOOP)).toBeNull();
  });
});

describe('isLooping', () => {
  it('is true only when both markers are set', () => {
    expect(isLooping({ a: 1, b: 2 })).toBe(true);
    expect(isLooping({ a: 1, b: null })).toBe(false);
    expect(isLooping(EMPTY_LOOP)).toBe(false);
  });
});
