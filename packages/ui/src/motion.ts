import { useCallback } from 'react';
import {
  Easing,
  FadeIn,
  FadeOut,
  FadeOutRight,
  useReducedMotion,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { motion } from './tokens';

/** FAB press, button taps, chip selection. */
export const springStiff: WithSpringConfig = motion.springStiff;

/** Bottom sheets, card expansion. */
export const springFluid: WithSpringConfig = motion.springFluid;

/** Layout animation for rows leaving a list (e.g. compliance row → Paid). */
export const glideOut = {
  durationMs: motion.glideOutMs,
  easing: Easing.out(Easing.ease),
} as const;

/**
 * Reduced-motion-aware animation helpers. When the OS Reduce Motion setting
 * is on, every spring degrades to a 120ms fade-style timing curve — state
 * changes still animate, nothing snaps.
 */
export function useMotion() {
  const reducedMotion = useReducedMotion();

  const spring = useCallback(
    (toValue: number, config: WithSpringConfig = springStiff) => {
      'worklet';
      return reducedMotion
        ? withTiming(toValue, { duration: motion.reducedMotionMs })
        : withSpring(toValue, config);
    },
    [reducedMotion]
  );

  return { reducedMotion, spring };
}

/**
 * Entering/exiting pair for list rows that glide out on removal,
 * degrading to plain fades under Reduce Motion.
 */
export function useGlideOut() {
  const reducedMotion = useReducedMotion();
  return {
    entering: FadeIn.duration(reducedMotion ? motion.reducedMotionMs : motion.glideOutMs),
    exiting: reducedMotion
      ? FadeOut.duration(motion.reducedMotionMs)
      : FadeOutRight.duration(motion.glideOutMs),
  };
}
