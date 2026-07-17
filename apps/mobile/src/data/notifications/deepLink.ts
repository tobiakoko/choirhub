// Pure deep-link routing for notification taps (§6.3 — "deep links from
// notification → announcement/event"). The server attaches a `data` payload to
// every push; tapping it should land the member on the right screen. Kept pure so
// the mapping is unit-tested without a router; the glue in handlers.ts feeds the
// result to expo-router.

export type NotificationTarget =
  | { type: 'announcement'; id: string }
  | { type: 'event'; id: string }
  | { type: 'campaign'; id: string }
  | { type: 'digest' };

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Parse a push `data` payload into a known target, or null when it is missing /
 * malformed (a tap then just opens the app at its default screen).
 */
export function parseNotificationTarget(data: unknown): NotificationTarget | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const type = asString(record.type);
  const id = asString(record.id);

  switch (type) {
    case 'announcement':
      return id ? { type: 'announcement', id } : null;
    case 'event':
      return id ? { type: 'event', id } : null;
    case 'campaign':
      return id ? { type: 'campaign', id } : null;
    case 'digest':
      return { type: 'digest' };
    default:
      return null;
  }
}

/**
 * The in-app route a target opens. Announcements and events deep-link to their
 * detail screen; a campaign reminder opens the compliance dashboard; the digest
 * opens the feed.
 */
export function routeForTarget(target: NotificationTarget): string {
  switch (target.type) {
    case 'announcement':
      return `/announcement/${target.id}`;
    case 'event':
      return `/event/${target.id}`;
    case 'campaign':
      return '/leader/compliance';
    case 'digest':
      return '/';
  }
}

/** Convenience: parse a raw payload straight to a route, or null. */
export function routeForNotification(data: unknown): string | null {
  const target = parseNotificationTarget(data);
  return target ? routeForTarget(target) : null;
}
