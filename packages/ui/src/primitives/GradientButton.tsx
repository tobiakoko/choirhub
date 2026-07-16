import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, type PressableProps, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { color, gradient, opacity, radii, size, spacing } from '../tokens';
import { AppText } from './AppText';
import { gradientPoints } from './gradientPoints';
import { usePressScale } from './usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type GradientButtonVariant = 'primary' | 'secondary';

const GRADIENT: Record<GradientButtonVariant, (typeof gradient)[keyof typeof gradient]> = {
  primary: gradient.actionPrimary,
  secondary: gradient.actionSecondary,
};

export type GradientButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: GradientButtonVariant;
  /** Required for screen readers; falls back to the label. */
  accessibilityLabel?: string;
};

/**
 * Primary call to action — the app's core aesthetic differentiator. Filled
 * with a 135° action gradient, fully rounded, 48px tall, and springs to 0.9×
 * on press (design system `button-primary`, §7.3 motion).
 */
export function GradientButton({
  label,
  variant = 'primary',
  disabled,
  accessibilityLabel,
  onPressIn,
  onPressOut,
  ...rest
}: GradientButtonProps) {
  const press = usePressScale();
  const { colors, angle } = GRADIENT[variant];
  const points = gradientPoints(angle);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
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
      style={[press.animatedStyle, disabled && styles.disabled]}
      {...rest}
    >
      <LinearGradient colors={colors} start={points.start} end={points.end} style={styles.fill}>
        <AppText variant="bodyMd" color={color.onColor}>
          {label}
        </AppText>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    minHeight: size.touchTarget,
    borderRadius: radii.full,
    paddingHorizontal: spacing.s6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
