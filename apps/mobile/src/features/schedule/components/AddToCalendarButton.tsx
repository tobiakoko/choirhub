import { GhostButton } from '@choirhub/ui';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { AgendaOccurrence } from '../agenda';
import { addToDeviceCalendar } from '../calendar';
import { toCalendarDraft } from '../calendarEvent';
import { deviceTimeZone } from '../datetime';

export type AddToCalendarButtonProps = {
  occurrence: AgendaOccurrence;
};

/**
 * "Add to phone calendar" — maps the occurrence to a calendar draft and writes it
 * to the device calendar via expo-calendar, in the device timezone. A ghost button
 * (secondary emphasis); surfaces permission denial and success plainly.
 */
export function AddToCalendarButton({ occurrence }: AddToCalendarButtonProps) {
  const [busy, setBusy] = useState(false);

  async function onPress() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await addToDeviceCalendar(toCalendarDraft(occurrence, deviceTimeZone()));
      if (result === 'permission-denied') {
        Alert.alert('Calendar access needed', 'Allow calendar access to add this event.');
      } else {
        Alert.alert('Added to calendar', occurrence.event.title);
      }
    } catch {
      Alert.alert('Could not add event', 'Something went wrong adding it to your calendar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <GhostButton
      label="Add to phone calendar"
      accessibilityLabel="Add to phone calendar"
      disabled={busy}
      onPress={onPress}
    />
  );
}
