import { AppText, GradientButton, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

import type { AckState } from '../ackState';
import type { CardAction } from '../feedModel';

export type CardActionRowProps = {
  action: CardAction;
  /** Ack state (only meaningful for the `acknowledge` action). */
  ackState: AckState;
  onAcknowledge: () => void;
  /** Handler for the event/form actions; wired as those features feed the list. */
  onAction?: (action: CardAction) => void;
};

/**
 * The full-width on-card action (design system §7.1: "Join Zoom, Acknowledge,
 * RSVP belong directly on the card"). Acknowledge is the wired path — it flips to
 * an instant confirmation the moment it is queued (🕓) and settles to ✓ once the
 * server confirms (§6.1). The event/form variants render the same full-width CTA
 * and defer to `onAction`.
 */
export function CardActionRow({ action, ackState, onAcknowledge, onAction }: CardActionRowProps) {
  if (action.kind === 'acknowledge') {
    if (ackState === 'none') {
      return (
        <GradientButton
          label="Acknowledge"
          accessibilityLabel="Acknowledge this announcement"
          onPress={onAcknowledge}
        />
      );
    }
    // Queued or confirmed — success is shown immediately, with 🕓 while offline.
    const queued = ackState === 'pending';
    const label = queued ? '🕓 Acknowledged — will send' : '✓ Acknowledged';
    return (
      <View accessibilityRole="text" accessibilityLabel={label} style={styles.confirmation}>
        <AppText variant="bodySm" color={tokens.color.statusSuccess}>
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <GradientButton
      label={ACTION_LABEL[action.kind]}
      accessibilityLabel={ACTION_LABEL[action.kind]}
      onPress={() => onAction?.(action)}
    />
  );
}

const ACTION_LABEL: Record<Exclude<CardAction['kind'], 'acknowledge'>, string> = {
  join_zoom: 'Join Zoom',
  rsvp: 'RSVP',
  fill_form: 'Fill form',
};

const styles = StyleSheet.create({
  confirmation: {
    minHeight: tokens.size.touchTarget,
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.canvasInset,
  },
});
