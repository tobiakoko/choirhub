import { AppText, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

import { isStale } from '../feedModel';
import { lastUpdatedLabel } from '../format';

export type SyncStatusPillProps = {
  lastSyncedAt: string | null;
  pendingCount: number;
  syncing: boolean;
};

/**
 * The feed's freshness chip (design system `pill-offline`, §6.1). Surfaces three
 * states, most-urgent first: queued writes ("🕓 N waiting to send"), an in-flight
 * sync ("⟳ Syncing…"), and stale content ("⟳ Last updated 2h ago"). Stays hidden
 * when data is fresh and nothing is pending — the quiet, trustworthy default.
 */
export function SyncStatusPill({ lastSyncedAt, pendingCount, syncing }: SyncStatusPillProps) {
  const label = pillLabel(lastSyncedAt, pendingCount, syncing);
  if (!label) return null;

  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={styles.pill}>
      <AppText variant="caption" color={tokens.color.inkSecondary}>
        {label}
      </AppText>
    </View>
  );
}

function pillLabel(
  lastSyncedAt: string | null,
  pendingCount: number,
  syncing: boolean
): string | null {
  if (pendingCount > 0) {
    return `🕓 ${pendingCount} waiting to send`;
  }
  if (syncing) return '⟳ Syncing…';
  if (isStale(lastSyncedAt)) return `⟳ ${lastUpdatedLabel(lastSyncedAt)}`;
  return null;
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.color.canvasInset,
    borderRadius: tokens.radii.full,
    borderWidth: tokens.borderWidth.hairline,
    borderColor: tokens.color.hairline,
    paddingVertical: tokens.spacing.s1,
    paddingHorizontal: tokens.spacing.s3,
  },
});
