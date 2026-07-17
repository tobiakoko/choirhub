import { AppText, CriticalText, tokens } from '@choirhub/ui';
import { Pressable, StyleSheet, View } from 'react-native';

export interface StepperRowProps {
  label: string;
  /** Display value (already formatted). Rendered with CriticalText — a time/hour
   *  must never truncate (accessibility floor). */
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  disabled?: boolean;
}

/** Label + a [−  value  +] stepper. Both buttons are 48px touch targets with their
 *  own accessibility labels. */
export function StepperRow({
  label,
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  disabled,
}: StepperRowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="bodyMd" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.controls}>
        <StepButton symbol="−" label={decrementLabel} onPress={onDecrement} disabled={disabled} />
        <CriticalText variant="bodyLg" style={styles.value}>
          {value}
        </CriticalText>
        <StepButton symbol="+" label={incrementLabel} onPress={onIncrement} disabled={disabled} />
      </View>
    </View>
  );
}

function StepButton({
  symbol,
  label,
  onPress,
  disabled,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <AppText variant="heading2" color={tokens.color.interactiveBase}>
        {symbol}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.size.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s4,
    paddingVertical: tokens.spacing.s2,
  },
  label: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  value: {
    minWidth: tokens.size.avatarLg,
    textAlign: 'center',
  },
  button: {
    width: tokens.size.touchTarget,
    height: tokens.size.touchTarget,
    borderRadius: tokens.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.interactiveGhost,
  },
  buttonPressed: {
    backgroundColor: tokens.color.canvasInset,
  },
  buttonDisabled: {
    opacity: tokens.opacity.disabled,
  },
});
