import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

import { color, radii, size } from '../tokens';
import { AppText } from './AppText';
import type { TypographyVariant } from '../tokens';

export type AvatarSize = 'sm' | 'md' | 'lg';

const DIAMETER: Record<AvatarSize, number> = {
  sm: size.avatarSm,
  md: size.avatarMd,
  lg: size.avatarLg,
};

const INITIALS_VARIANT: Record<AvatarSize, TypographyVariant> = {
  sm: 'caption',
  md: 'bodySm',
  lg: 'heading2',
};

export type AvatarProps = {
  /** Full name — drives the accessibility label and initials fallback. */
  name: string;
  source?: ImageSourcePropType;
  size?: AvatarSize;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Circular avatar — member photo when available, branded initials otherwise.
 */
export function Avatar({ name, source, size: avatarSize = 'md' }: AvatarProps) {
  const diameter = DIAMETER[avatarSize];
  const shape = { width: diameter, height: diameter, borderRadius: radii.full };

  if (source) {
    return (
      <Image
        source={source}
        accessibilityRole="image"
        accessibilityLabel={name}
        style={shape}
      />
    );
  }

  return (
    <View accessibilityRole="image" accessibilityLabel={name} style={[styles.fallback, shape]}>
      <AppText variant={INITIALS_VARIANT[avatarSize]} color={color.interactiveBase}>
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.interactiveGhost,
  },
});
