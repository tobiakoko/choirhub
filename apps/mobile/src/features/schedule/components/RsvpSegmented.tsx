import { AppText, tokens } from '@choirhub/ui';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RsvpStatus } from '../rsvpState';

export type RsvpSegmentedProps = {
  value: RsvpStatus | null;
  /** True while the selection is queued but not yet confirmed (🕓, §6.1). */
  pending: boolean;
  onSelect: (status: RsvpStatus) => void;
};

const SEGMENTS: { status: RsvpStatus; label: string }[] = [
  { status: 'yes', label: 'Yes' },
  { status: 'maybe', label: 'Maybe' },
  { status: 'no', label: 'No' },
];

// Selected fill per answer — emerald "Yes" replaces the legacy gold marker (§1.5).
const SELECTED_FILL: Record<RsvpStatus, string> = {
  yes: tokens.color.statusSuccess,
  maybe: tokens.color.statusWarning,
  no: tokens.color.inkSecondary,
};

/**
 * The on-card RSVP control (design system: actions live on the card, §7.1). Three
 * 48px segments — Yes / Maybe / No — each a full 48×48 touch target. The selected
 * answer fills with its semantic color; a queued selection shows a 🕓 note until
 * it syncs.
 */
function RsvpSegmentedComponent({ value, pending, onSelect }: RsvpSegmentedProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row} accessibilityRole="radiogroup">
        {SEGMENTS.map((segment) => {
          const active = value === segment.status;
          return (
            <Pressable
              key={segment.status}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`RSVP ${segment.label}`}
              onPress={() => onSelect(segment.status)}
              style={[
                styles.segment,
                active
                  ? { backgroundColor: SELECTED_FILL[segment.status] }
                  : styles.segmentIdle,
              ]}
            >
              <AppText
                variant="bodySm"
                color={active ? tokens.color.onColor : tokens.color.inkSecondary}
              >
                {segment.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {pending ? (
        <AppText variant="caption" color={tokens.color.inkSecondary}>
          🕓 Saving your RSVP
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s2,
  },
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.s2,
  },
  segment: {
    flex: 1,
    minHeight: tokens.size.touchTarget,
    borderRadius: tokens.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: tokens.borderWidth.hairline,
    borderColor: 'transparent',
  },
  segmentIdle: {
    backgroundColor: tokens.color.canvasInset,
    borderColor: tokens.color.hairline,
  },
});

export const RsvpSegmented = memo(RsvpSegmentedComponent);
