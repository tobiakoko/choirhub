import { AppText, tokens } from '@choirhub/ui';
import { StyleSheet, Switch, View } from 'react-native';

export interface ToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** A settings row with a native switch. 48px min height; the switch carries the
 *  row's accessibility label so a screen reader announces "<label>, switch". */
export function ToggleRow({ label, subtitle, value, onValueChange, disabled }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="bodyMd">{label}</AppText>
        {subtitle ? (
          <AppText variant="bodySm" color={tokens.color.inkSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityRole="switch"
        trackColor={{ true: tokens.color.interactiveBase, false: tokens.color.hairlineStrong }}
        thumbColor={tokens.color.onColor}
      />
    </View>
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
  text: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
});
