import { Stack } from 'expo-router';

import { StorageScreen } from '@/features/settings';

/** Storage manager (§ settings). Pushed from Settings. */
export default function StorageRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Storage' }} />
      <StorageScreen />
    </>
  );
}
