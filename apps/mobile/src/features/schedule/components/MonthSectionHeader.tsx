import { SectionLabel, tokens } from '@choirhub/ui';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

export type MonthSectionHeaderProps = {
  label: string;
};

/**
 * Month-strip section header sitting above each month's agenda items
 * ("JULY 2026"). Uses the uppercase SectionLabel with §4 breathing room.
 */
function MonthSectionHeaderComponent({ label }: MonthSectionHeaderProps) {
  return (
    <View style={styles.container}>
      <SectionLabel>{label}</SectionLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: tokens.spacing.s6,
    paddingBottom: tokens.spacing.s2,
  },
});

export const MonthSectionHeader = memo(MonthSectionHeaderComponent);
