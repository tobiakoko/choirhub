import { Stack, useLocalSearchParams } from 'expo-router';

import { EventDetailScreen } from '@/features/schedule';

/** Event detail — the deep-link target of an event notification (§6.3). */
export default function EventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Event' }} />
      <EventDetailScreen id={id} />
    </>
  );
}
