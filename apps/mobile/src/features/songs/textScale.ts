// The lyrics/solfa text-scale slider maths (design system §2.3: "a dedicated slider
// to scale further for active rehearsal use", 1.0–1.8×). Independent of OS Dynamic
// Type — this is the in-sheet zoom a chorister nudges mid-rehearsal. Pure so the
// slider component stays a thin gesture shell.

export const TEXT_SCALE_MIN = 1.0;
export const TEXT_SCALE_MAX = 1.8;
/** Slider snaps to 0.1× notches so the value is legible and repeatable. */
export const TEXT_SCALE_STEP = 0.1;

export function clampTextScale(scale: number): number {
  if (!Number.isFinite(scale)) return TEXT_SCALE_MIN;
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, scale));
}

/** Snap to the nearest step, avoiding float drift like 1.3000000000000003. */
export function snapTextScale(scale: number): number {
  const steps = Math.round((clampTextScale(scale) - TEXT_SCALE_MIN) / TEXT_SCALE_STEP);
  return Math.round((TEXT_SCALE_MIN + steps * TEXT_SCALE_STEP) * 100) / 100;
}

/** Slider fraction (0 at left = 1.0×, 1 at right = 1.8×) → snapped scale. */
export function scaleFromFraction(fraction: number): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  return snapTextScale(TEXT_SCALE_MIN + clamped * (TEXT_SCALE_MAX - TEXT_SCALE_MIN));
}

/** Scale → slider fraction, for positioning the thumb from a stored value. */
export function fractionFromScale(scale: number): number {
  return (clampTextScale(scale) - TEXT_SCALE_MIN) / (TEXT_SCALE_MAX - TEXT_SCALE_MIN);
}

/** Label for the slider readout, e.g. `1.4×`. */
export function formatScale(scale: number): string {
  return `${snapTextScale(scale).toFixed(1)}×`;
}
