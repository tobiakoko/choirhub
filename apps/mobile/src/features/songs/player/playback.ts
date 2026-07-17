// Pure playback maths for the repertoire player (design system §7.2). Kept apart
// from the expo-av hook so speed cycling, the A–B loop, and progress are unit-
// testable without a native sound object.

/** Playback speeds the control cycles through (spec: 0.5× / 0.75× / 1×). */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

/** Next speed in the cycle, wrapping 1× → 0.5×. */
export function nextSpeed(current: PlaybackSpeed): PlaybackSpeed {
  const idx = PLAYBACK_SPEEDS.indexOf(current);
  return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
}

/** Fraction 0–1 of the track elapsed; safe for the zero/unknown-duration case. */
export function progressFraction(
  positionMillis: number,
  durationMillis: number | undefined
): number {
  if (!durationMillis || durationMillis <= 0) return 0;
  return Math.min(1, Math.max(0, positionMillis / durationMillis));
}

/** Position (ms) for a fraction of the track — powers press-to-seek on the bar. */
export function positionForFraction(fraction: number, durationMillis: number | undefined): number {
  if (!durationMillis || durationMillis <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, fraction)) * durationMillis);
}

/** A–B repeat markers, in milliseconds. Null until the member sets them. */
export interface AbLoop {
  a: number | null;
  b: number | null;
}

export const EMPTY_LOOP: AbLoop = { a: null, b: null };

export function isLooping(loop: AbLoop): boolean {
  return loop.a != null && loop.b != null;
}

/**
 * One tap of the A–B control at the current position:
 * 1. no A yet → set A here,
 * 2. A set, no B → set B here if it's after A (else move A here),
 * 3. both set → clear the loop.
 */
export function cycleAbLoop(loop: AbLoop, positionMillis: number): AbLoop {
  if (loop.a == null) return { a: positionMillis, b: null };
  if (loop.b == null) {
    return positionMillis > loop.a
      ? { a: loop.a, b: positionMillis }
      : { a: positionMillis, b: null };
  }
  return { ...EMPTY_LOOP };
}

/** When a full A–B loop is armed and playback has reached B, the position to seek
 *  back to (A); otherwise null (let playback continue). */
export function loopSeekTarget(positionMillis: number, loop: AbLoop): number | null {
  if (loop.a != null && loop.b != null && positionMillis >= loop.b) return loop.a;
  return null;
}
