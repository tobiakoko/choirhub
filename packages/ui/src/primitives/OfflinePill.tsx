import { StyleSheet, View, type ViewProps } from 'react-native';

import { borderWidth, color, radii, spacing } from '../tokens';
import { AppText } from './AppText';

export type OfflinePillProps = ViewProps & {
  /** Copy shown in the pill. Defaults to the offline-available message. */
  label?: string;
};

/**
 * "✓ Available offline" chip that appears once the caching engine has
 * pre-fetched an asset (design system §6, §7.2) — reassures members that
 * airplane mode during service is safe.
 */
export function OfflinePill({
  label = 'Available offline',
  style,
  accessibilityLabel,
  ...rest
}: OfflinePillProps) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, style]}
      {...rest}
    >
      <AppText variant="caption" color={color.inkSecondary}>
        {`✓ ${label}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.canvasInset,
    borderRadius: radii.full,
    borderWidth: borderWidth.hairline,
    borderColor: color.hairline,
    paddingVertical: spacing.s1,
    paddingHorizontal: spacing.s3,
  },
});
