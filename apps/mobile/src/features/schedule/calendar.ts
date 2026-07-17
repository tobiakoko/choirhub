// Thin wrapper over expo-calendar for "Add to phone calendar". The pure mapping
// lives in calendarEvent.ts; this file only handles permission + the native write,
// so it is the one piece that touches the device calendar store.

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import type { CalendarEventDraft } from './calendarEvent';

export type AddToCalendarResult = 'added' | 'permission-denied';

/** Request permission and create the event on the device's default calendar. */
export async function addToDeviceCalendar(draft: CalendarEventDraft): Promise<AddToCalendarResult> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return 'permission-denied';

  const calendarId = await resolveWritableCalendarId();
  await Calendar.createEventAsync(calendarId, {
    title: draft.title,
    startDate: draft.startDate,
    endDate: draft.endDate,
    location: draft.location,
    notes: draft.notes,
    timeZone: draft.timeZone,
  });
  return 'added';
}

/** iOS exposes a default calendar; on Android we pick the first writable one. */
async function resolveWritableCalendarId(): Promise<string> {
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.id;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable =
    calendars.find(
      (c) => c.accessLevel === Calendar.CalendarAccessLevel.OWNER && c.allowsModifications
    ) ?? calendars.find((c) => c.allowsModifications);
  if (!writable) throw new Error('No writable calendar available on this device');
  return writable.id;
}
