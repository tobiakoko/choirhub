import { AppText, ProgressBar, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

import type { CampaignProgress } from '../compliance';

export type CampaignProgressBarProps = {
  progress: CampaignProgress;
  /** Optional heading above the bar (e.g. a location name in the roll-up). */
  title?: string;
};

/**
 * Campaign progress — the cyan gradient bar (§7.2) with a "resolved of total"
 * count. Resolved = complete + exempt; the fill is the resolved ratio.
 */
export function CampaignProgressBar({ progress, title }: CampaignProgressBarProps) {
  const summary = `${progress.resolved} of ${progress.total} done`;
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        {title ? <AppText variant="bodySm">{title}</AppText> : <View />}
        <AppText variant="caption" color={tokens.color.inkSecondary}>
          {summary}
        </AppText>
      </View>
      <ProgressBar ratio={progress.ratio} variant="secondary" accessibilityLabel={summary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
});
