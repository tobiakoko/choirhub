import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { color, elevation, gradient, opacity, radii, size } from '../tokens';
import { AppText } from './AppText';
import { gradientPoints } from './gradientPoints';
import { usePressScale } from './usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FABProps = Omit<PressableProps, 'style'> & {
  /** Required — describes the action, e.g. "Compose announcement". */
  accessibilityLabel: string;
  /** Glyph/icon; defaults to a plus sign. */
  icon?: ReactNode;
};

/**
 * Floating action button — 64×64 gradient circle at the top of the Z-axis,
 * lifted by the luminous indigo tinted shadow, springs to 0.9× on press
 * (design system `fab-compose`, §7.3). Screens anchor it (bottom-right).
 */
export function FAB({ accessibilityLabel, icon, disabled, onPressIn, onPressOut, ...rest }: FABProps) {
  const press = usePressScale();
  const points = gradientPoints(gradient.actionPrimary.angle);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={(e) => {
        press.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        press.onPressOut();
        onPressOut?.(e);
      }}
      style={[styles.shadow, press.animatedStyle, disabled && styles.disabled]}
      {...rest}
    >
      <LinearGradient
        colors={gradient.actionPrimary.colors}
        start={points.start}
        end={points.end}
        style={styles.fill}
      >
        {icon ?? (
          <AppText variant="heading1" color={color.onColor}>
            +
          </AppText>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    width: size.fab,
    height: size.fab,
    borderRadius: radii.full,
    ...elevation.fab,
  },
  fill: {
    flex: 1,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
