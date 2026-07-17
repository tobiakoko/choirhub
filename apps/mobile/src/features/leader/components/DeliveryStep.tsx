import { AppText, CriticalText, SelectableOption, tokens } from '@choirhub/ui';
import { StyleSheet, Switch, View } from 'react-native';

import {
  type ComposeState,
  DELIVERY_TIERS,
  type DeliveryTier,
} from '../composeModel';

export type DeliveryStepProps = {
  state: ComposeState;
  /** Critical is offered only to location leaders / coordinators (§5). */
  canSetCritical: boolean;
  onChange: (patch: Partial<ComposeState>) => void;
};

/** 09:00 tomorrow, local — the default when scheduling for the morning digest. */
function defaultSchedule(now: Date = new Date()): string {
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <AppText variant="bodyMd">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={tokens.color.inkTertiary}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: tokens.color.interactiveBase, false: tokens.color.hairlineStrong }}
        thumbColor={tokens.color.onColor}
      />
    </View>
  );
}

/**
 * Step 3 — Delivery: the notification tier (§6.3), require-acknowledgment, pin,
 * and scheduling. Critical carries the SMS-fallback copy and is disabled unless
 * the author may raise it (§5); the gate is re-proven server-side by RLS.
 */
export function DeliveryStep({ state, canSetCritical, onChange }: DeliveryStepProps) {
  const scheduled = state.scheduleAt !== null;

  return (
    <View style={styles.container}>
      <AppText variant="bodySm" color={tokens.color.inkSecondary}>
        Delivery
      </AppText>
      {DELIVERY_TIERS.map((tier) => {
        const locked = tier.value === 'critical' && !canSetCritical;
        return (
          <SelectableOption
            key={tier.value}
            label={tier.label}
            description={
              locked ? 'Only location leaders can send Critical.' : tier.description
            }
            selected={state.tier === tier.value}
            disabled={locked}
            onPress={() => onChange({ tier: tier.value as DeliveryTier })}
          />
        );
      })}

      <ToggleRow
        label="Require acknowledgment"
        hint="Members tap to confirm they have read it."
        value={state.requireAck}
        onValueChange={(requireAck) => onChange({ requireAck })}
      />
      <ToggleRow
        label="Pin to top"
        hint="Keeps it above the feed until unpinned."
        value={state.pin}
        onValueChange={(pin) => onChange({ pin })}
      />
      <ToggleRow
        label="Schedule for later"
        value={scheduled}
        onValueChange={(on) => onChange({ scheduleAt: on ? defaultSchedule() : null })}
      />
      {scheduled ? (
        <CriticalText variant="bodySm" color={tokens.color.inkSecondary}>
          {`Publishes ${new Date(state.scheduleAt as string).toLocaleString()}`}
        </CriticalText>
      ) : (
        <AppText variant="caption" color={tokens.color.inkTertiary}>
          Publishes immediately.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.size.touchTarget,
    gap: tokens.spacing.s3,
  },
  toggleText: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
});
