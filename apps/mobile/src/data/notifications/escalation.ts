// Pure deadline-escalation policy (§6.3). Re-notify pending members at T-72h and
// T-24h before a deadline — the automation that replaces manual WhatsApp chasing.
// The hourly escalation cron pulls campaigns with a live deadline and asks, per
// campaign, which tiers are "due" this hour; each tier fires at most once (latched
// server-side in escalation_sent).

export type EscalationTier = 'T-72h' | 'T-24h';

export const ESCALATION_OFFSETS: readonly { tier: EscalationTier; hours: number }[] = [
  { tier: 'T-72h', hours: 72 },
  { tier: 'T-24h', hours: 24 },
];

const MS_PER_HOUR = 3_600_000;

/**
 * Tiers whose window is open right now for a deadline. A tier at offset H is due
 * when the deadline is within the (H-1, H] hour bucket ahead — so an hourly job
 * fires each tier exactly once as the deadline approaches. Past deadlines and
 * deadlines further out than the largest offset yield nothing.
 */
export function dueEscalations(deadlineMs: number, nowMs: number): EscalationTier[] {
  const hoursUntil = (deadlineMs - nowMs) / MS_PER_HOUR;
  if (hoursUntil <= 0) return [];
  return ESCALATION_OFFSETS.filter(
    (o) => hoursUntil <= o.hours && hoursUntil > o.hours - 1
  ).map((o) => o.tier);
}
