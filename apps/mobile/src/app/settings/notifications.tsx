import { Stack } from 'expo-router';

import { NotificationSettingsScreen } from '@/features/settings';

/** Notification preferences (§6.3). Pushed from Settings. */
export default function NotificationSettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Notifications' }} />
      <NotificationSettingsScreen />
    </>
  );
}
