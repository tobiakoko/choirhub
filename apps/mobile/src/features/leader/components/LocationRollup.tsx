import { Card, SectionLabel, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

import { type ComplianceRow, rollupByLocation } from '../compliance';
import { CampaignProgressBar } from './CampaignProgressBar';

export type LocationRollupProps = {
  rows: ComplianceRow[];
};

/**
 * The coordinator's cross-location roll-up (§5): one progress bar per location so
 * a regional coordinator sees, at a glance, which locations are behind. A single-
 * location leader never renders this (they see only their own rows anyway).
 */
export function LocationRollup({ rows }: LocationRollupProps) {
  const groups = rollupByLocation(rows);
  if (groups.length <= 1) return null;

  return (
    <View style={styles.container}>
      <SectionLabel>By location</SectionLabel>
      <Card>
        <View style={styles.list}>
          {groups.map((group) => (
            <CampaignProgressBar
              key={group.locationName}
              title={group.locationName}
              progress={group.progress}
            />
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s2,
  },
  list: {
    gap: tokens.spacing.s4,
  },
});
