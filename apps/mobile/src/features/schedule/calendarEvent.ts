// Pure builder for the "Add to phone calendar" payload. Kept separate from the
// expo-calendar wrapper so the mapping (which occurrence, what title/notes/venue)
// is unit-testable without the native module.

import type { AgendaOccurrence } from './agenda';

export interface CalendarEventDraft {
  title: string;
  startDate: Date;
  /** Falls back to a one-hour block when the event has no explicit end. */
  endDate: Date;
  /** Physical venue or the meeting URL. */
  location?: string;
  /** Uniform directive + description folded into the calendar notes. */
  notes?: string;
  timeZone: string;
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

/** Map one agenda occurrence to a calendar draft in the given timezone. */
export function toCalendarDraft(occurrence: AgendaOccurrence, timeZone: string): CalendarEventDraft {
  const { event, startIso, endIso } = occurrence;
  const startDate = new Date(startIso);
  const endDate = endIso
    ? new Date(endIso)
    : new Date(startDate.getTime() + DEFAULT_DURATION_MS);

  const noteLines: string[] = [];
  if (event.uniformDirective) noteLines.push(`Uniform: ${event.uniformDirective}`);
  if (event.description) noteLines.push(event.description);

  return {
    title: event.title,
    startDate,
    endDate,
    location: event.description ?? event.meetingUrl ?? undefined,
    notes: noteLines.length > 0 ? noteLines.join('\n') : undefined,
    timeZone,
  };
}
