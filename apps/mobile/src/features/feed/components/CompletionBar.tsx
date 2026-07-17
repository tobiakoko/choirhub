import { AppText, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

import type { AckCompletion } from '../ackState';

export type CompletionBarProps = {
  completion: AckCompletion;
};

/**
 * Leader-only acknowledgment roll-up (§5). Shows how many members have
 * acknowledged and, when the audience size is known, an emerald progress fill.
 * Rendered inside the card below the body; members never see it.
 */
export function CompletionBar({ completion }: CompletionBarProps) {
  const { acknowledged, total, ratio } = completion;
  const label =
    total !== undefined
      ? `${acknowledged} of ${total} acknowledged`
      : `${acknowledged} acknowledged`;

  return (
    <View style={styles.container}>
      <AppText variant="caption" color={tokens.color.inkSecondary}>
        {label}
      </AppText>
      {ratio !== undefined ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 1, now: ratio }}
          style={styles.track}
        >
          <View style={[styles.fill, { flex: Math.max(ratio, 0.001) }]} />
          <View style={{ flex: Math.max(1 - ratio, 0) }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s2,
    paddingTop: tokens.spacing.s2,
  },
  track: {
    flexDirection: 'row',
    height: tokens.size.sheetHandleHeight,
    borderRadius: tokens.radii.full,
    backgroundColor: tokens.color.canvasInset,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: tokens.color.statusSuccess,
    borderRadius: tokens.radii.full,
  },
});
