import { tokens } from '@choirhub/ui';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { useFeedSync } from '@/features/feed';
import { registerRehearsalPackPrefetch } from '@/features/songs';
import { useSession } from '@/features/onboarding/api';

/**
 * The app shell members land in after approval. Boots the sync engine here (not in
 * a single screen) so pulls and queued writes work no matter which tab opens first.
 * Home · Schedule · Songs exist today; More arrives with that feature.
 */
export default function TabsLayout() {
  const { session } = useSession();
  useFeedSync(session?.user.id);

  // Define the rehearsal-pack prefetch task once for the session (§6.2). It only
  // runs on Wi-Fi + charging, so registering it early is harmless.
  useEffect(() => {
    registerRehearsalPackPrefetch();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.interactiveBase,
        tabBarInactiveTintColor: tokens.color.inkTertiary,
        tabBarStyle: {
          backgroundColor: tokens.color.canvasElevated,
          borderTopColor: tokens.color.hairline,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="songs" options={{ title: 'Songs' }} />
    </Tabs>
  );
}
