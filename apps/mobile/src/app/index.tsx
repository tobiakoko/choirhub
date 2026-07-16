import { AppText, tokens } from '@choirhub/ui';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useMembershipStatus, useSession } from '@/features/onboarding/api';

function Loading() {
  return (
    <View style={styles.screen}>
      <ActivityIndicator color={tokens.color.interactiveBase} />
      <AppText variant="bodySm" color={tokens.color.inkTertiary}>
        Loading…
      </AppText>
    </View>
  );
}

/**
 * Auth gate. Sends the member to the right place based on their session and
 * approval status: no session → phone entry; authed but no profile → invite
 * step; pending/declined → the pending-approval screen; approved → the app.
 */
export default function Index() {
  const { session, loading } = useSession();
  const membership = useMembershipStatus(session?.user.id);

  if (loading) {
    return <Loading />;
  }
  if (!session) {
    return <Redirect href="/onboarding/phone" />;
  }
  if (membership.isLoading) {
    return <Loading />;
  }

  const status = membership.data?.status ?? null;
  if (status === 'approved') {
    return <Redirect href="/(tabs)" />;
  }
  if (status === 'pending' || status === 'declined') {
    return <Redirect href="/onboarding/pending" />;
  }
  // Authenticated but no profile yet — resume at the invite step.
  return <Redirect href="/onboarding/invite" />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.s2,
    backgroundColor: tokens.color.canvasBase,
  },
});
