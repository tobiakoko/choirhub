import { AppText, Card, GhostButton, GradientButton, tokens } from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/features/onboarding/components/OnboardingScaffold';
import { useMembershipStatus, useSession } from '@/features/onboarding/api';
import { supabase } from '@/data/supabase';
import { useOnboardingStore } from '@/features/onboarding/store';

export default function PendingScreen() {
  const router = useRouter();
  const { session } = useSession();
  const membership = useMembershipStatus(session?.user.id);
  const locationName = useOnboardingStore((s) => s.locationName);
  const leaderName = useOnboardingStore((s) => s.leaderName);
  const leaderPhone = useOnboardingStore((s) => s.leaderPhone);
  const reset = useOnboardingStore((s) => s.reset);

  const status = membership.data?.status;
  const declined = status === 'declined';

  // The moment a leader approves, route into the app (realtime, no polling).
  useEffect(() => {
    if (status === 'approved') {
      reset();
      router.replace('/(tabs)');
    }
  }, [status, reset, router]);

  function callLeader() {
    if (leaderPhone) {
      Linking.openURL(`tel:${leaderPhone}`);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    reset();
    router.replace('/onboarding/phone');
  }

  const leaderLabel = leaderName ? `Call ${leaderName}` : 'Call your location leader';

  return (
    <OnboardingScaffold
      step={5}
      totalSteps={5}
      title={declined ? 'Your request needs a follow-up' : "You're almost in"}
      subtitle={
        declined
          ? 'Your join request was not approved. Your location leader can help sort it out.'
          : `We've sent your request to the ${locationName || 'choir'} leader. You'll get in as soon as they approve you.`
      }
      footer={
        <>
          <GradientButton
            label={leaderLabel}
            onPress={callLeader}
            disabled={!leaderPhone}
            accessibilityLabel={leaderLabel}
          />
          <GhostButton label="Use a different number" onPress={signOut} />
        </>
      }
    >
      <Card category={declined ? 'critical' : 'rehearsal'}>
        <View style={styles.status}>
          <AppText variant="heading2">
            {declined ? 'Not approved yet' : 'Waiting for approval'}
          </AppText>
          <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
            {declined
              ? 'Give your leader a call so they can add you to the choir.'
              : 'This screen updates on its own — keep it open, or come back later. We’ll let you in automatically.'}
          </AppText>
          {leaderPhone ? (
            <AppText variant="bodySm" color={tokens.color.inkSecondary}>
              {leaderName ? `${leaderName} · ` : ''}
              {leaderPhone}
            </AppText>
          ) : (
            <AppText variant="bodySm" color={tokens.color.inkTertiary}>
              Reach out to your location leader if it’s taking a while.
            </AppText>
          )}
        </View>
      </Card>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  status: {
    gap: tokens.spacing.s2,
  },
});
