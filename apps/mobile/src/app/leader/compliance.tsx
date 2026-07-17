import { Stack } from 'expo-router';

import { ComplianceDashboard } from '@/features/leader';

/** Full-screen compliance dashboard (§5). Pushed from the More hub. */
export default function ComplianceRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Compliance' }} />
      <ComplianceDashboard />
    </>
  );
}
