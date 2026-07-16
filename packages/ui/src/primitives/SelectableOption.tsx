import { Pressable, type PressableProps, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { borderWidth, color, radii, size, spacing } from '../tokens';
import { AppText } from './AppText';
import { usePressScale } from './usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type SelectableOptionProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** Optional secondary line (e.g. a country name under a dial code). */
  description?: string;
  /** Leading adornment (flag emoji, icon). */
  leading?: React.ReactNode;
  selected?: boolean;
  accessibilityLabel?: string;
};

/**
 * A tappable single-choice row (radio semantics) for pickers — voice part,
 * country. Selected state lifts the border to Electric Indigo over a ghost-indigo
 * fill and shows a check. 48px min height, tactile press spring. Tokens only.
 */
export function SelectableOption({
  label,
  description,
  leading,
  selected = false,
  accessibilityLabel,
  onPressIn,
  onPressOut,
  ...rest
}: SelectableOptionProps) {
  const press = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPressIn={(e) => {
        press.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        press.onPressOut();
        onPressOut?.(e);
      }}
      style={[styles.row, selected ? styles.rowSelected : styles.rowIdle, press.animatedStyle]}
      {...rest}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <AppText variant="bodyLg" color={selected ? color.interactiveBase : color.inkPrimary}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" color={color.inkSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.check, selected ? styles.checkOn : styles.checkOff]}>
        {selected ? (
          <AppText variant="bodySm" color={color.onColor}>
            ✓
          </AppText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.touchTarget,
    borderRadius: radii.md,
    borderWidth: borderWidth.hairline,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    gap: spacing.s3,
  },
  rowIdle: {
    backgroundColor: color.canvasElevated,
    borderColor: color.hairline,
  },
  rowSelected: {
    backgroundColor: color.interactiveGhost,
    borderColor: color.interactiveBase,
  },
  leading: {
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.s1,
  },
  check: {
    width: size.avatarSm,
    height: size.avatarSm,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: color.interactiveBase,
  },
  checkOff: {
    borderWidth: borderWidth.hairline,
    borderColor: color.hairlineStrong,
  },
});
