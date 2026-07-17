import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { color, gradient, radii, size } from '../tokens';
import { gradientPoints } from './gradientPoints';

export type ProgressBarVariant = 'primary' | 'secondary';

const GRADIENT: Record<ProgressBarVariant, (typeof gradient)[keyof typeof gradient]> = {
  primary: gradient.actionPrimary,
  secondary: gradient.actionSecondary,
};

export type ProgressBarProps = {
  /** Fill fraction, 0–1 (clamped). */
  ratio: number;
  /** `secondary` is the cyan→blue action gradient (compliance campaigns, §7.2). */
  variant?: ProgressBarVariant;
  accessibilityLabel?: string;
};

/**
 * A slim gradient progress track — the campaign-progress bar on the compliance
 * dashboard (cyan gradient) and any other determinate fill. The track is the inset
 * canvas; the fill is a horizontal action gradient clipped to `ratio`. Tokens only.
 */
export function ProgressBar({ ratio, variant = 'secondary', accessibilityLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const { colors, angle } = GRADIENT[variant];
  const points = gradientPoints(angle);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 1, now: clamped }}
      style={styles.track}
    >
      <LinearGradient
        colors={colors}
        start={points.start}
        end={points.end}
        style={[styles.fill, { width: `${clamped * 100}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: size.progressTrackHeight,
    borderRadius: radii.full,
    backgroundColor: color.canvasInset,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
