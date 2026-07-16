import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { springStiff } from '../motion';
import { motion } from '../tokens';

/**
 * Tactile press feedback: shrinks a control to `pressedScale` on press-in and
 * springs it back on release (design system "Motion over Mutability"). Under
 * OS Reduce Motion the spring degrades to a 120ms fade-in timing curve.
 */
export function usePressScale(pressedScale = 0.9, config: WithSpringConfig = springStiff) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animateTo = useCallback(
    (to: number) => {
      scale.value = reducedMotion
        ? withTiming(to, { duration: motion.reducedMotionMs })
        : withSpring(to, config);
    },
    [reducedMotion, config, scale]
  );

  const onPressIn = useCallback(() => animateTo(pressedScale), [animateTo, pressedScale]);
  const onPressOut = useCallback(() => animateTo(1), [animateTo]);

  return { animatedStyle, onPressIn, onPressOut };
}
