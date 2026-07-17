import { Stack } from 'expo-router';

import { SettingsScreen } from '@/features/settings';

/** Settings hub. Pushed from the More tab. */
export default function SettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Settings' }} />
      <SettingsScreen />
    </>
  );
}
