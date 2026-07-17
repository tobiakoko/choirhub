import { Stack } from 'expo-router';

import { MemberManagementScreen } from '@/features/leader';

/** Full-screen member management — approvals + invite codes (§5). */
export default function MembersRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Members' }} />
      <MemberManagementScreen />
    </>
  );
}
