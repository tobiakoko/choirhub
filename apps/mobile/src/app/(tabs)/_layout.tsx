import { tokens } from '@choirhub/ui';
import { Tabs } from 'expo-router';

/**
 * The app shell members land in after approval. Only Home exists today; the full
 * four-tab layout (Home · Schedule · Songs · More) arrives with those features.
 */
export default function TabsLayout() {
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
    </Tabs>
  );
}
