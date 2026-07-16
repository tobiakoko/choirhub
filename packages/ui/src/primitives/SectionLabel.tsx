import { StyleSheet, Text, type TextProps } from 'react-native';

import { color, typography } from '../tokens';

export type SectionLabelProps = TextProps & {
  /** A color token value. Defaults to inkTertiary. */
  color?: string;
};

/**
 * Uppercase group heading that separates feed/agenda sections
 * ("TODAY", "EARLIER THIS WEEK") — design system §4 breathing room.
 */
export function SectionLabel({
  color: textColor = color.inkTertiary,
  style,
  allowFontScaling = true,
  ...rest
}: SectionLabelProps) {
  return (
    <Text
      accessibilityRole="header"
      allowFontScaling={allowFontScaling}
      style={[styles.label, { color: textColor }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.role.caption.fontSize,
    lineHeight: typography.role.caption.lineHeight,
    letterSpacing: typography.role.badge.letterSpacing,
    textTransform: 'uppercase',
  },
});
