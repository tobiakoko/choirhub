import { tokens } from '@choirhub/ui';
import { Tabs } from 'expo-router';

import { useFeedSync } from '@/features/feed';
import { useSession } from '@/features/onboarding/api';

/**
 * The app shell members land in after approval. Boots the sync engine here (not in
 * a single screen) so pulls and queued writes work no matter which tab opens first.
 * Home · Schedule exist today; Songs · More arrive with those features.
 */
export default function TabsLayout() {
  const { session } = useSession();
  useFeedSync(session?.user.id);

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
    </Tabs>
  );
}
