// Pure notification-delivery policy (§6.3). No expo/React imports — this is the
// single source of truth for *how* a notification is delivered, exercised by jest
// and mirrored by the Deno edge fan-out (supabase/functions/_shared/notificationPolicy.ts).
//
// Priority tiers (§6.3):
//   Critical  → high-importance push, overrides quiet hours, SMS fallback eligible
//   Important → standard push, deferred during quiet hours
//   Normal    → silent, folded into the daily digest (never an immediate push)

export type Priority = 'normal' | 'important' | 'critical';

/** Android notification channels (§6.3 — critical / default / silent). */
export type AndroidChannelId = 'critical' | 'default' | 'silent';

export type Delivery = 'push_high' | 'push_default' | 'digest_silent';

export function deliveryForPriority(priority: Priority): Delivery {
  switch (priority) {
    case 'critical':
      return 'push_high';
    case 'important':
      return 'push_default';
    case 'normal':
      return 'digest_silent';
  }
}

export function androidChannelForPriority(priority: Priority): AndroidChannelId {
  switch (priority) {
    case 'critical':
      return 'critical';
    case 'important':
      return 'default';
    case 'normal':
      return 'silent';
  }
}

export interface QuietHours {
  /** Local hour [0,23] the window opens, or null when quiet hours are off. */
  start: number | null;
  /** Local hour [0,23] the window closes (exclusive), or null. */
  end: number | null;
}

/**
 * Is `hour` inside the quiet-hours window? Handles a window that wraps midnight
 * (e.g. 22 → 7). A null/zero-length window is never quiet.
 */
export function isWithinQuietHours(hour: number, quiet: QuietHours): boolean {
  const { start, end } = quiet;
  if (start == null || end == null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export interface DeliveryContext {
  priority: Priority;
  category: string;
  mutedCategories: readonly string[];
  /** The recipient's current local hour [0,23]. */
  localHour: number;
  quietHours: QuietHours;
}

export type DeliveryDecision =
  | { deliver: true; channel: AndroidChannelId }
  | { deliver: false; reason: 'muted' | 'digest' | 'quiet-hours' };

/**
 * Decide whether an announcement pushes to one recipient right now. Critical
 * always breaks through mutes and quiet hours (it is the escalation tier); Normal
 * never pushes (the digest carries it); Important pushes unless the category is
 * muted or the recipient is within quiet hours.
 */
export function decideDelivery(ctx: DeliveryContext): DeliveryDecision {
  const isCritical = ctx.priority === 'critical';

  if (!isCritical && ctx.mutedCategories.includes(ctx.category)) {
    return { deliver: false, reason: 'muted' };
  }
  if (deliveryForPriority(ctx.priority) === 'digest_silent') {
    return { deliver: false, reason: 'digest' };
  }
  if (!isCritical && isWithinQuietHours(ctx.localHour, ctx.quietHours)) {
    return { deliver: false, reason: 'quiet-hours' };
  }
  return { deliver: true, channel: androidChannelForPriority(ctx.priority) };
}

/**
 * SMS-fallback provider for a phone number (§6.3): Termii for the +234 (Nigeria)
 * corridor, Twilio elsewhere. Pure so both the settings copy and the edge adapter
 * agree on which carrier a member's number routes through.
 */
export type SmsProvider = 'termii' | 'twilio';

export function smsProviderForPhone(phone: string): SmsProvider {
  return phone.replace(/[\s-]/g, '').startsWith('+234') ? 'termii' : 'twilio';
}
