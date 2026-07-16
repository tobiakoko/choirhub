import { AppText, Card, GradientButton, TextField, tokens } from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/features/onboarding/components/OnboardingScaffold';
import { mapOnboardingError, type OnboardingError } from '@/features/onboarding/errors';
import { useValidateInviteCode } from '@/features/onboarding/api';
import { useOnboardingStore } from '@/features/onboarding/store';

export default function InviteScreen() {
  const router = useRouter();
  const setDraft = useOnboardingStore((s) => s.set);
  const validate = useValidateInviteCode();

  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<OnboardingError | undefined>();

  const ready = code.trim().length >= 4;

  async function onContinue() {
    setProblem(undefined);
    try {
      const invite = await validate.mutateAsync(code.trim());
      setDraft({
        code: code.trim(),
        locationName: invite.locationName,
        leaderName: invite.leaderName,
        leaderPhone: invite.leaderPhone,
      });
      router.push('/onboarding/profile');
    } catch (e) {
      setProblem(mapOnboardingError(e));
    }
  }

  return (
    <OnboardingScaffold
      step={3}
      totalSteps={5}
      title="Enter your invite code"
      subtitle="Your location leader shares a code that links you to the right choir."
      onBack={() => router.back()}
      footer={
        <GradientButton
          label={validate.isPending ? 'Checking…' : 'Continue'}
          onPress={onContinue}
          disabled={!ready || validate.isPending}
          accessibilityLabel="Check invite code"
        />
      }
    >
      <TextField
        label="Invite code"
        value={code}
        onChangeText={(t) => {
          setCode(t.toUpperCase());
          setProblem(undefined);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        placeholder="DCWELCOME"
        error={problem?.message}
      />

      {/* Recoverable wrong-code error, always with the human fallback. */}
      {problem ? (
        <Card category="critical" accessibilityLabel={`${problem.title}. ${problem.message}`}>
          <View style={styles.problem}>
            <AppText variant="heading2">{problem.title}</AppText>
            <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
              {problem.message}
            </AppText>
            <AppText variant="bodySm" color={tokens.color.inkSecondary}>
              Can’t find a code? Call your location leader — they can send you a new one.
            </AppText>
          </View>
        </Card>
      ) : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  problem: {
    gap: tokens.spacing.s2,
    paddingLeft: tokens.spacing.s2,
  },
});
