import { AppText, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

import { firstName, greeting } from '../format';
import { SyncStatusPill } from './SyncStatusPill';

export type FeedHeaderProps = {
  displayName: string | null;
  locationName: string | null;
  voicePart: string | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  syncing: boolean;
};

/**
 * Personalized feed header: a time-of-day greeting with the member's first name,
 * their scope line (location · voice part), and the sync-freshness pill. Uses
 * heading-1 for the greeting per the type scale; the scope never truncates.
 */
export function FeedHeader({
  displayName,
  locationName,
  voicePart,
  lastSyncedAt,
  pendingCount,
  syncing,
}: FeedHeaderProps) {
  const name = displayName ? firstName(displayName) : null;
  const heading = name ? `${greeting()}, ${name}` : greeting();
  const scope = [locationName, voicePart ? titleCase(voicePart) : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <AppText variant="heading1">{heading}</AppText>
      {scope ? (
        <AppText variant="bodySm" color={tokens.color.inkSecondary}>
          {scope}
        </AppText>
      ) : null}
      <SyncStatusPill lastSyncedAt={lastSyncedAt} pendingCount={pendingCount} syncing={syncing} />
    </View>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s2,
    paddingBottom: tokens.spacing.s4,
  },
});
