// The live schedule query. Observes events, RSVPs, and the outbox, and folds them
// through the pure agenda model into month-sectioned rows plus a per-event RSVP
// view (observe → auto-update, CLAUDE.md rule 3). Renders entirely from
// WatermelonDB, so the agenda is fully available offline.

import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';

import { database } from '@/data/database';
import { Event, OutboxEntry, Rsvp, Tables } from '@/data/models';

import type { AgendaRow, ScheduleEvent } from './agenda';
import { buildAgenda, defaultWindow, flattenAgenda } from './agenda';
import { deviceTimeZone } from './datetime';
import { deriveRsvp } from './rsvpState';
import type { ConfirmedRsvp, PendingRsvp, RsvpView } from './rsvpState';
import { useObservable } from '../feed/useObservable';

const notDeleted = () => [Q.where('deleted_at', null)];

export interface UseScheduleParams {
  profileId: string;
  /** Injectable for tests/determinism; defaults to now. */
  now?: Date;
  /** Injectable timezone; defaults to the device zone. */
  timeZone?: string;
}

export interface UseSchedule {
  rows: AgendaRow[];
  rsvpByEvent: ReadonlyMap<string, RsvpView>;
  isEmpty: boolean;
}

interface RsvpPayload {
  event_id: string;
  status: PendingRsvp['status'];
}

export function useSchedule({ profileId, now, timeZone }: UseScheduleParams): UseSchedule {
  const events = useObservable<Event[]>(
    () => database.get<Event>(Tables.events).query(...notDeleted()).observe(),
    [],
    []
  );
  const rsvps = useObservable<Rsvp[]>(
    () => database.get<Rsvp>(Tables.rsvps).query(...notDeleted()).observe(),
    [],
    []
  );
  const outbox = useObservable<OutboxEntry[]>(
    () => database.get<OutboxEntry>(Tables.outbox).query().observe(),
    [],
    []
  );

  const zone = timeZone ?? deviceTimeZone();
  const window = useMemo(() => defaultWindow(now), [now]);

  const scheduleEvents = useMemo<ScheduleEvent[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt ?? null,
        description: e.description ?? null,
        uniformDirective: e.uniformDirective ?? null,
        meetingUrl: e.meetingUrl ?? null,
        recurrenceRule: e.recurrenceRule ?? null,
      })),
    [events]
  );

  const rows = useMemo(
    () => flattenAgenda(buildAgenda(scheduleEvents, window, zone)),
    [scheduleEvents, window, zone]
  );

  const confirmed = useMemo<ConfirmedRsvp[]>(
    () => rsvps.map((r) => ({ eventId: r.eventId, profileId: r.profileId, status: r.status })),
    [rsvps]
  );

  const pending = useMemo<PendingRsvp[]>(
    () =>
      outbox
        .filter((o) => o.mutationType === 'rsvp')
        .map((o) => {
          const payload = JSON.parse(o.payload) as RsvpPayload;
          return { eventId: payload.event_id, status: payload.status, seq: o.seq };
        }),
    [outbox]
  );

  const rsvpByEvent = useMemo(() => {
    const map = new Map<string, RsvpView>();
    for (const e of scheduleEvents) {
      map.set(e.id, deriveRsvp(e.id, profileId, confirmed, pending));
    }
    return map;
  }, [scheduleEvents, profileId, confirmed, pending]);

  return { rows, rsvpByEvent, isEmpty: rows.length === 0 };
}
