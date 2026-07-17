import { AppText, tokens } from '@choirhub/ui';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { CATEGORY_FILTERS, type CategoryFilter } from '../feedModel';

export type CategoryFilterChipsProps = {
  selected: CategoryFilter;
  onSelect: (value: CategoryFilter) => void;
};

/**
 * Horizontal, scrollable category filter (design system §7.1 feed anatomy). One
 * pill per category plus a leading "All"; the active pill fills Electric Indigo,
 * the rest are ghost. Each pill honors the 48px touch minimum.
 */
function CategoryFilterChipsComponent({ selected, onSelect }: CategoryFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {CATEGORY_FILTERS.map((chip) => (
        <Chip
          key={chip.value}
          label={chip.label}
          active={chip.value === selected}
          onPress={() => onSelect(chip.value)}
        />
      ))}
    </ScrollView>
  );
}

type ChipProps = { label: string; active: boolean; onPress: () => void };

const Chip = memo(function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <AppText
        variant="bodySm"
        color={active ? tokens.color.onColor : tokens.color.inkSecondary}
      >
        {label}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    gap: tokens.spacing.s2,
    paddingBottom: tokens.spacing.s3,
    paddingRight: tokens.spacing.s4,
  },
  chip: {
    minHeight: tokens.size.touchTarget,
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: tokens.borderWidth.hairline,
  },
  chipActive: {
    backgroundColor: tokens.color.interactiveBase,
    borderColor: tokens.color.interactiveBase,
  },
  chipIdle: {
    backgroundColor: tokens.color.canvasElevated,
    borderColor: tokens.color.hairline,
  },
});

export const CategoryFilterChips = memo(CategoryFilterChipsComponent);
