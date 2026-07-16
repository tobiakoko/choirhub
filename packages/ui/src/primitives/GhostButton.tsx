import { Pressable, type PressableProps, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { color, opacity, radii, size, spacing } from '../tokens';
import { AppText } from './AppText';
import { usePressScale } from './usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type GhostButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  accessibilityLabel?: string;
};

/**
 * Low-emphasis action — transparent fill, Electric Indigo label
 * (design system `button-ghost`). Shares the tactile press spring.
 */
export function GhostButton({
  label,
  disabled,
  accessibilityLabel,
  onPressIn,
  onPressOut,
  ...rest
}: GhostButtonProps) {
  const press = usePressScale();

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
      style={[styles.button, press.animatedStyle, disabled && styles.disabled]}
      {...rest}
    >
      <AppText variant="bodySm" color={color.interactiveBase}>
        {label}
      </AppText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: size.touchTarget,
    borderRadius: radii.full,
    paddingHorizontal: spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
