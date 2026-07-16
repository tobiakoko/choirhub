import { Text, type TextProps } from 'react-native';

import { color as colors, typography } from '../tokens';
import type { TypographyVariant } from '../tokens';

export type AppTextProps = TextProps & {
  /** Type-scale role from the design system. Defaults to bodyMd. */
  variant?: TypographyVariant;
  /** A color token value (e.g. color.inkSecondary). Defaults to inkPrimary. */
  color?: string;
};

const HEADER_VARIANTS: ReadonlySet<TypographyVariant> = new Set([
  'displayLg',
  'heading1',
  'heading2',
]);

/**
 * Variant-driven text primitive — the only sanctioned way to render type.
 * Pulls font family, size, line height, and tracking straight from the token
 * scale. `allowFontScaling` stays on so layouts flex to 200% Dynamic Type.
 */
export function AppText({
  variant = 'bodyMd',
  color = colors.inkPrimary,
  style,
  accessibilityRole,
  allowFontScaling = true,
  ...rest
}: AppTextProps) {
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (HEADER_VARIANTS.has(variant) ? 'header' : 'text')}
      allowFontScaling={allowFontScaling}
      style={[typography.role[variant], { color }, style]}
      {...rest}
    />
  );
}
