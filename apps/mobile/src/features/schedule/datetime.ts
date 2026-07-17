// Timezone-aware formatting for the schedule. Events are stored as UTC ISO
// timestamps (server `timestamptz`, §4) and always rendered in the *device's*
// timezone so a rehearsal at 19:00 America/Chicago and the same member travelling
// to a +234 (Africa/Lagos) device both read the correct local wall-clock time.
//
// All formatting goes through Intl.DateTimeFormat with an explicit `timeZone`, so
// the functions are deterministic and unit-testable by passing a zone; production
// callers omit it and get the device zone.

/** The device's IANA timezone (e.g. "Africa/Lagos"), resolved once. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function zoned(iso: string, timeZone: string | undefined, opts: Intl.DateTimeFormatOptions): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone ?? deviceTimeZone(),
    ...opts,
  }).format(date);
  // Normalize the narrow/no-break spaces newer ICU inserts before AM/PM so output
  // is stable across engines (Hermes vs Node).
  return formatted.replace(/[  ]/g, ' ');
}

/** "7:00 PM" in the given (default: device) timezone. */
export function formatTime(iso: string, timeZone?: string): string {
  return zoned(iso, timeZone, { hour: 'numeric', minute: '2-digit' });
}

/** "7:00 – 9:00 PM" (or just the start when there is no end). Collapses a shared
 *  AM/PM suffix so the range stays compact. */
export function formatTimeRange(startIso: string, endIso: string | undefined, timeZone?: string): string {
  const start = formatTime(startIso, timeZone);
  if (!endIso) return start;
  const end = formatTime(endIso, timeZone);
  const startMeridiem = start.slice(-2);
  const endMeridiem = end.slice(-2);
  if (startMeridiem === endMeridiem) {
    return `${start.slice(0, -3)} – ${end}`;
  }
  return `${start} – ${end}`;
}

/** "Mon, Jul 20" in the given (default: device) timezone. */
export function formatDayLabel(iso: string, timeZone?: string): string {
  return zoned(iso, timeZone, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Day-of-month number as shown in the agenda date chip ("20"). */
export function formatDayOfMonth(iso: string, timeZone?: string): string {
  return zoned(iso, timeZone, { day: 'numeric' });
}

/** Short weekday for the agenda date chip ("Mon"). */
export function formatWeekday(iso: string, timeZone?: string): string {
  return zoned(iso, timeZone, { weekday: 'short' });
}

/**
 * A sortable month bucket key ("2026-07") in the device timezone — the grouping
 * unit for month-strip section headers. Computed via the localized year/month so
 * an event near midnight lands in the month the member actually sees it in.
 */
export function monthKey(iso: string, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone ?? deviceTimeZone(),
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}

/** "July 2026" — the month-strip header label. */
export function monthLabel(iso: string, timeZone?: string): string {
  return zoned(iso, timeZone, { month: 'long', year: 'numeric' });
}
