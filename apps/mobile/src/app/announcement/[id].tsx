import { Stack, useLocalSearchParams } from 'expo-router';

import { AnnouncementDetailScreen } from '@/features/feed';

/** Announcement detail — the deep-link target of an announcement notification (§6.3). */
export default function AnnouncementRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Announcement' }} />
      <AnnouncementDetailScreen id={id} />
    </>
  );
}
