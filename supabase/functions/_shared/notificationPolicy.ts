// Deno mirror of the canonical notification policy tested in the app
// (apps/mobile/src/data/notifications/{policy,escalation,digest}.ts). Kept as a
// small, dependency-free copy because the Supabase edge bundler scopes a function
// to the supabase/ tree — it cannot reach into the app workspace. Keep the two in
// sync; the app copy is the one under jest.

export type Priority = 'normal' | 'important' | 'critical';
export type AndroidChannelId = 'critical' | 'default' | 'silent';

export function androidChannelForPriority(priority: Priority): AndroidChannelId {
  return priority === 'critical' ? 'critical' : priority === 'important' ? 'default' : 'silent';
}

export interface QuietHours {
  start: number | null;
  end: number | null;
}

export function isWithinQuietHours(hour: number, quiet: QuietHours): boolean {
  const { start, end } = quiet;
  if (start == null || end == null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export interface DeliveryContext {
  priority: Priority;
  category: string;
  mutedCategories: readonly string[];
  localHour: number;
  quietHours: QuietHours;
}

export type DeliveryDecision =
  | { deliver: true; channel: AndroidChannelId }
  | { deliver: false; reason: 'muted' | 'digest' | 'quiet-hours' };

export function decideDelivery(ctx: DeliveryContext): DeliveryDecision {
  const isCritical = ctx.priority === 'critical';
  if (!isCritical && ctx.mutedCategories.includes(ctx.category)) {
    return { deliver: false, reason: 'muted' };
  }
  if (ctx.priority === 'normal') return { deliver: false, reason: 'digest' };
  if (!isCritical && isWithinQuietHours(ctx.localHour, ctx.quietHours)) {
    return { deliver: false, reason: 'quiet-hours' };
  }
  return { deliver: true, channel: androidChannelForPriority(ctx.priority) };
}

export type SmsProvider = 'termii' | 'twilio';
export function smsProviderForPhone(phone: string): SmsProvider {
  return phone.replace(/[\s-]/g, '').startsWith('+234') ? 'termii' : 'twilio';
}

// ── escalation ──────────────────────────────────────────────────────────────
export type EscalationTier = 'T-72h' | 'T-24h';
const ESCALATION_OFFSETS: ReadonlyArray<{ tier: EscalationTier; hours: number }> = [
  { tier: 'T-72h', hours: 72 },
  { tier: 'T-24h', hours: 24 },
];

export function dueEscalations(deadlineMs: number, nowMs: number): EscalationTier[] {
  const hoursUntil = (deadlineMs - nowMs) / 3_600_000;
  if (hoursUntil <= 0) return [];
  return ESCALATION_OFFSETS.filter((o) => hoursUntil <= o.hours && hoursUntil > o.hours - 1).map(
    (o) => o.tier
  );
}

// ── digest ──────────────────────────────────────────────────────────────────
export interface DigestItem {
  id: string;
  title: string;
  category: string;
}

export function buildDigest(items: readonly DigestItem[]): { title: string; body: string } | null {
  const count = items.length;
  if (count === 0) return null;
  const title = count === 1 ? '1 new update' : `${count} new updates`;
  const shown = items.slice(0, 3).map((i) => i.title);
  const remainder = count - shown.length;
  const body = remainder > 0 ? `${shown.join(' · ')} +${remainder} more` : shown.join(' · ');
  return { title, body };
}

/** The recipient's current local hour [0,23] for a IANA timezone. */
export function localHourIn(timezone: string, now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
    // Intl may render midnight as "24"; normalise to 0.
    return Number(hour) % 24;
  } catch {
    return now.getUTCHours();
  }
}
