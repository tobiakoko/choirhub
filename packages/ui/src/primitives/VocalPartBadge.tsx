import { Badge, type BadgeProps } from './Badge';

export type VocalPart = 'soprano' | 'alto' | 'tenor' | 'bass';

/**
 * Vocal-part chip — "TENOR" in Electric Indigo on a ghost-indigo background
 * (design system §7.2). Always the brand tone.
 */
export type VocalPartBadgeProps = Omit<BadgeProps, 'label' | 'tone'> & {
  part: VocalPart;
};

export function VocalPartBadge({ part, accessibilityLabel, ...rest }: VocalPartBadgeProps) {
  return (
    <Badge
      label={part.toUpperCase()}
      tone="brand"
      accessibilityLabel={accessibilityLabel ?? `Voice part: ${part}`}
      {...rest}
    />
  );
}
