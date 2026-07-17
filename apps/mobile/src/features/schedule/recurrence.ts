// Recurrence for the schedule — parse a stored rule, describe it for the card, and
// expand it into concrete occurrences for the agenda. Events store an iCalendar
// RRULE string in `recurrence_rule` (§4); weekly rehearsals are the common case, so
// we support the WEEKLY/DAILY subset with INTERVAL, COUNT, UNTIL, and BYDAY.
//
// Expansion strides in whole days on the UTC instant. A DST transition inside the
// window would shift the local wall-clock hour by one; that is an accepted
// simplification for weekly rehearsals and is called out here rather than hidden.

import { formatWeekday } from './datetime';

export type Weekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

const WEEKDAY_INDEX: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
const WEEKDAYS = Object.keys(WEEKDAY_INDEX) as Weekday[];

export interface Recurrence {
  freq: 'WEEKLY' | 'DAILY';
  interval: number;
  count?: number;
  /** ISO timestamp; occurrences at or before it are included, later ones dropped. */
  until?: string;
  byDay?: Weekday[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse an RRULE string. Returns null for an empty rule or an unsupported FREQ
 *  (the event is then treated as a one-off). */
export function parseRecurrence(rule: string | null | undefined): Recurrence | null {
  if (!rule || !rule.trim()) return null;

  const parts = new Map<string, string>();
  for (const segment of rule.replace(/^RRULE:/i, '').split(';')) {
    const [key, value] = segment.split('=');
    if (key && value) parts.set(key.trim().toUpperCase(), value.trim());
  }

  const freqRaw = parts.get('FREQ')?.toUpperCase();
  if (freqRaw !== 'WEEKLY' && freqRaw !== 'DAILY') return null;

  const interval = Math.max(1, Number.parseInt(parts.get('INTERVAL') ?? '1', 10) || 1);
  const countRaw = parts.get('COUNT');
  const count = countRaw ? Number.parseInt(countRaw, 10) : undefined;
  const until = parseUntil(parts.get('UNTIL'));

  const byDay = parts
    .get('BYDAY')
    ?.split(',')
    .map((d) => d.trim().toUpperCase())
    .filter((d): d is Weekday => (WEEKDAYS as string[]).includes(d));

  return {
    freq: freqRaw,
    interval,
    ...(count && count > 0 ? { count } : {}),
    ...(until ? { until } : {}),
    ...(byDay && byDay.length > 0 ? { byDay } : {}),
  };
}

/** iCal UNTIL ("20261231T235959Z" or "20261231") → ISO, or undefined. */
function parseUntil(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!m) return undefined;
  const [, y, mo, d, hh = '23', mm = '59', ss = '59'] = m;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export interface ExpandWindow {
  /** Inclusive lower bound (ISO) — occurrences before it are dropped. */
  fromIso: string;
  /** Inclusive upper bound (ISO) — the agenda is finite, no infinite scroll. */
  toIso: string;
  /** Hard cap so a runaway rule can never blow up the list. */
  maxOccurrences?: number;
}

/**
 * Expand an event into the concrete start timestamps that fall inside the window,
 * ascending. A non-recurring event yields at most its own start (when in range).
 */
export function expandOccurrences(
  startIso: string,
  rule: string | null | undefined,
  window: ExpandWindow
): string[] {
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return [];

  const from = new Date(window.fromIso).getTime();
  const to = new Date(window.toIso).getTime();
  const max = window.maxOccurrences ?? 100;

  const recurrence = parseRecurrence(rule);
  if (!recurrence) {
    return start >= from && start <= to ? [startIso] : [];
  }

  const untilMs = recurrence.until ? new Date(recurrence.until).getTime() : undefined;
  const stepDays = recurrence.freq === 'DAILY' ? recurrence.interval : recurrence.interval * 7;

  // Day offsets within one cycle: BYDAY weekdays relative to the start's weekday,
  // else just the start itself.
  const startDow = new Date(start).getUTCDay();
  const dayOffsets =
    recurrence.freq === 'WEEKLY' && recurrence.byDay
      ? recurrence.byDay.map((d) => WEEKDAY_INDEX[d] - startDow)
      : [0];

  const results: number[] = [];
  let emitted = 0;
  for (let cycle = 0; ; cycle += 1) {
    const cycleBase = start + cycle * stepDays * DAY_MS;
    // Stop once even the earliest slot in this cycle is past the window / caps.
    if (cycleBase > to && Math.min(...dayOffsets) >= 0) break;
    if (cycle > max * 2 + 366) break; // absolute safety net

    let anyEmittable = false;
    for (const offset of dayOffsets.slice().sort((a, b) => a - b)) {
      const occ = cycleBase + offset * DAY_MS;
      if (occ < start) continue; // never before the event's own start
      if (untilMs !== undefined && occ > untilMs) continue;
      if (occ > to) continue;
      anyEmittable = true;
      if (occ >= from) results.push(occ);
      emitted += 1;
      if (recurrence.count !== undefined && emitted >= recurrence.count) {
        return finalize(results, max);
      }
    }
    // If this cycle produced nothing emittable and we're already past the window, stop.
    if (!anyEmittable && cycleBase > to) break;
    if (results.length >= max) break;
  }

  return finalize(results, max);
}

function finalize(msList: number[], max: number): string[] {
  return Array.from(new Set(msList))
    .sort((a, b) => a - b)
    .slice(0, max)
    .map((ms) => new Date(ms).toISOString());
}

/** Human label for the card ("Every week on Thursday", "Every 2 weeks", ""). */
export function describeRecurrence(
  rule: string | null | undefined,
  startIso: string,
  timeZone?: string
): string {
  const recurrence = parseRecurrence(rule);
  if (!recurrence) return '';

  if (recurrence.freq === 'DAILY') {
    return recurrence.interval === 1 ? 'Every day' : `Every ${recurrence.interval} days`;
  }

  const days =
    recurrence.byDay && recurrence.byDay.length > 0
      ? recurrence.byDay.map(weekdayName).join(', ')
      : formatWeekday(startIso, timeZone);

  const cadence = recurrence.interval === 1 ? 'Every week' : `Every ${recurrence.interval} weeks`;
  return `${cadence} on ${days}`;
}

const WEEKDAY_NAME: Record<Weekday, string> = {
  SU: 'Sunday',
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
};
function weekdayName(day: Weekday): string {
  return WEEKDAY_NAME[day];
}
