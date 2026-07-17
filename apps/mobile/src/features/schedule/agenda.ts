// Builds the agenda: expands every (possibly recurring) event into concrete
// occurrences inside a bounded window, sorts them ascending, and groups them under
// month-strip section headers. Bounded by design — the schedule is a finite agenda
// list, never an infinite scroll (per the schedule spec).

import { monthKey, monthLabel } from './datetime';
import { expandOccurrences, type ExpandWindow } from './recurrence';

/** The event shape the agenda operates on (a WatermelonDB Event satisfies it). */
export interface ScheduleEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  description?: string | null;
  uniformDirective?: string | null;
  meetingUrl?: string | null;
  recurrenceRule?: string | null;
}

/** One concrete instance of an event on the agenda. */
export interface AgendaOccurrence {
  /** Stable key: event id + occurrence start (a recurring event has many). */
  key: string;
  event: ScheduleEvent;
  startIso: string;
  endIso?: string;
}

export interface MonthSection {
  /** Sortable "YYYY-MM" bucket. */
  key: string;
  /** "July 2026". */
  label: string;
  items: AgendaOccurrence[];
}

/** Duration between start and end, preserved across recurring occurrences. */
function durationMs(event: ScheduleEvent): number | null {
  if (!event.endsAt) return null;
  const d = new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime();
  return Number.isFinite(d) && d > 0 ? d : null;
}

/**
 * Expand + sort + group. `timeZone` (default: device) decides which month an
 * occurrence falls in, so an event just before midnight lands where the member
 * sees it.
 */
export function buildAgenda(
  events: readonly ScheduleEvent[],
  window: ExpandWindow,
  timeZone?: string
): MonthSection[] {
  const occurrences: AgendaOccurrence[] = [];

  for (const event of events) {
    const dur = durationMs(event);
    for (const startIso of expandOccurrences(event.startsAt, event.recurrenceRule, window)) {
      const endIso =
        dur !== null ? new Date(new Date(startIso).getTime() + dur).toISOString() : undefined;
      occurrences.push({ key: `${event.id}:${startIso}`, event, startIso, endIso });
    }
  }

  occurrences.sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime());

  // Group into month sections, preserving ascending order.
  const sections: MonthSection[] = [];
  let current: MonthSection | null = null;
  for (const occ of occurrences) {
    const key = monthKey(occ.startIso, timeZone);
    if (!current || current.key !== key) {
      current = { key, label: monthLabel(occ.startIso, timeZone), items: [] };
      sections.push(current);
    }
    current.items.push(occ);
  }
  return sections;
}

/** The default agenda window: from the start of today out `days` (finite list). */
export function defaultWindow(now: Date = new Date(), days = 120): ExpandWindow {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

// ── flatten to a single virtualized list ─────────────────────────────────────

export type AgendaRow =
  | { type: 'month'; key: string; label: string }
  | { type: 'event'; key: string; occurrence: AgendaOccurrence };

/** Interleave month headers and occurrence rows into one flat, keyed array. */
export function flattenAgenda(sections: readonly MonthSection[]): AgendaRow[] {
  const rows: AgendaRow[] = [];
  for (const section of sections) {
    rows.push({ type: 'month', key: `month:${section.key}`, label: section.label });
    for (const occ of section.items) rows.push({ type: 'event', key: occ.key, occurrence: occ });
  }
  return rows;
}
