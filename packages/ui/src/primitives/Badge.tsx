import { StyleSheet, View, type ViewProps } from 'react-native';

import { color, radii, spacing, typography } from '../tokens';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'critical';

const TONE: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: color.canvasInset, text: color.inkSecondary },
  brand: { background: color.interactiveGhost, text: color.interactiveBase },
  info: { background: color.statusInfo, text: color.onColor },
  success: { background: color.statusSuccess, text: color.onColor },
  warning: { background: color.statusWarning, text: color.onColor },
  critical: { background: color.statusCritical, text: color.onColor },
};

export type BadgeProps = ViewProps & {
  label: string;
  tone?: BadgeTone;
};

/**
 * Small 10px uppercase tag — vocal parts, "NEW", "PINNED", status chips
 * (design system §2.2). Uses the `badge` type role (extra-bold, tracked).
 */
export function Badge({ label, tone = 'neutral', style, accessibilityLabel, ...rest }: BadgeProps) {
  const palette = TONE[tone];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.badge, { backgroundColor: palette.background }, style]}
      {...rest}
    >
      <AppText variant="badge" color={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingVertical: spacing.s1,
    paddingHorizontal: spacing.s2,
    // Keep the tracked last glyph from clipping on the right edge.
    minWidth: typography.role.badge.fontSize,
  },
});
