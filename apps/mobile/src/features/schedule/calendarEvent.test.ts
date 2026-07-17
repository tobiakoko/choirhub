import type { AgendaOccurrence } from './agenda';
import { toCalendarDraft } from './calendarEvent';

const occurrence = (over: Partial<AgendaOccurrence['event']> = {}): AgendaOccurrence => ({
  key: 'a:2026-07-02T18:00:00.000Z',
  startIso: '2026-07-02T18:00:00.000Z',
  endIso: '2026-07-02T20:00:00.000Z',
  event: {
    id: 'a',
    title: 'Regional Rehearsal',
    startsAt: '2026-07-02T18:00:00.000Z',
    endsAt: '2026-07-02T20:00:00.000Z',
    uniformDirective: 'Full choir robes',
    description: 'Main Auditorium',
    ...over,
  },
});

describe('toCalendarDraft', () => {
  it('maps the occurrence into a calendar draft', () => {
    const draft = toCalendarDraft(occurrence(), 'Africa/Lagos');
    expect(draft.title).toBe('Regional Rehearsal');
    expect(draft.startDate.toISOString()).toBe('2026-07-02T18:00:00.000Z');
    expect(draft.endDate.toISOString()).toBe('2026-07-02T20:00:00.000Z');
    expect(draft.location).toBe('Main Auditorium');
    expect(draft.notes).toBe('Uniform: Full choir robes\nMain Auditorium');
    expect(draft.timeZone).toBe('Africa/Lagos');
  });

  it('defaults to a one-hour block when the event has no end', () => {
    const occ = occurrence({ endsAt: null });
    const draft = toCalendarDraft({ ...occ, endIso: undefined }, 'Africa/Lagos');
    expect(draft.endDate.toISOString()).toBe('2026-07-02T19:00:00.000Z');
  });

  it('falls back to the meeting URL for location when there is no venue', () => {
    const occ = occurrence({ description: null, meetingUrl: 'https://zoom.us/j/123' });
    const draft = toCalendarDraft(occ, 'Africa/Lagos');
    expect(draft.location).toBe('https://zoom.us/j/123');
  });
});
