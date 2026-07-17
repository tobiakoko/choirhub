import { AppText, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

export type ComplianceEmptyStateProps = {
  /** Shown when a campaign is fully resolved vs. simply having no members yet. */
  variant: 'complete' | 'empty';
};

/**
 * The reward state for the compliance dashboard: when nobody is left pending, an
 * isometric "stacked coins" motif (three graduated diamonds) crowned with a check
 * replaces the list — the celebratory close spec'd for a finished campaign. A
 * separate copy handles a campaign that simply has no members yet.
 */
export function ComplianceEmptyState({ variant }: ComplianceEmptyStateProps) {
  const complete = variant === 'complete';
  return (
    <View style={styles.container}>
      <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.diamond, styles.base]} />
        <View style={[styles.diamond, styles.mid]} />
        <View style={[styles.diamond, styles.top]} />
        {complete ? (
          <View style={styles.check}>
            <AppText variant="heading2" color={tokens.color.onColor}>
              ✓
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="heading2">{complete ? "Everyone's paid" : 'No members yet'}</AppText>
      <AppText variant="bodyMd" color={tokens.color.inkSecondary} style={styles.caption}>
        {complete
          ? 'Every member on this campaign is settled. Nothing left to chase.'
          : 'Once members join this campaign they will appear here.'}
      </AppText>
    </View>
  );
}

// An isometric diamond = a square rotated 45° then squashed vertically.
const DIAMOND = tokens.size.avatarLg;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: tokens.spacing.s3,
    paddingVertical: tokens.spacing.s12,
  },
  stack: {
    width: DIAMOND * 2,
    height: DIAMOND * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.s4,
  },
  diamond: {
    position: 'absolute',
    width: DIAMOND,
    height: DIAMOND,
    borderRadius: tokens.radii.sm,
    transform: [{ rotate: '45deg' }, { scaleY: 0.5 }],
  },
  base: {
    backgroundColor: tokens.color.statusInfo,
    top: DIAMOND * 0.9,
    opacity: tokens.opacity.disabled,
  },
  mid: {
    backgroundColor: tokens.color.statusInfo,
    top: DIAMOND * 0.55,
    opacity: 0.75,
  },
  top: {
    backgroundColor: tokens.color.statusInfo,
    top: DIAMOND * 0.2,
  },
  check: {
    width: tokens.size.avatarMd,
    height: tokens.size.avatarMd,
    borderRadius: tokens.radii.full,
    backgroundColor: tokens.color.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.elevation.level2,
  },
  caption: {
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.s6,
  },
});
