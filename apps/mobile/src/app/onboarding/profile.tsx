import type { VocalPart } from '@choirhub/ui';
import { AppText, GradientButton, SectionLabel, SelectableOption, TextField, tokens } from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/features/onboarding/components/OnboardingScaffold';
import { mapOnboardingError } from '@/features/onboarding/errors';
import { useJoinWithInviteCode } from '@/features/onboarding/api';
import { useOnboardingStore } from '@/features/onboarding/store';
import { VOICE_PART_OPTIONS } from '@/features/onboarding/voiceParts';

// undefined = nothing chosen yet; null = the deliberate "Not sure" choice.
type Choice = VocalPart | null | undefined;

export default function ProfileScreen() {
  const router = useRouter();
  const code = useOnboardingStore((s) => s.code);
  const locationName = useOnboardingStore((s) => s.locationName);
  const setDraft = useOnboardingStore((s) => s.set);
  const join = useJoinWithInviteCode();

  const [name, setName] = useState('');
  const [voicePart, setVoicePart] = useState<Choice>(undefined);
  const [error, setError] = useState<string | undefined>();

  const chosen = voicePart !== undefined;
  const ready = name.trim().length > 0 && chosen;

  async function onJoin() {
    setError(undefined);
    try {
      const result = await join.mutateAsync({
        code,
        displayName: name.trim(),
        voicePart: voicePart ?? null,
      });
      setDraft({ leaderName: result.leaderName, leaderPhone: result.leaderPhone });
      router.replace('/onboarding/pending');
    } catch (e) {
      setError(mapOnboardingError(e).message);
    }
  }

  return (
    <OnboardingScaffold
      step={4}
      totalSteps={5}
      title="Tell us about you"
      subtitle={locationName ? `You're joining ${locationName}.` : undefined}
      onBack={() => router.back()}
      footer={
        <GradientButton
          label={join.isPending ? 'Joining…' : 'Join choir'}
          onPress={onJoin}
          disabled={!ready || join.isPending}
          accessibilityLabel="Join the choir"
        />
      }
    >
      <TextField
        label="Your name"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(undefined);
        }}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        autoFocus
        placeholder="The name your choir knows you by"
        error={error}
      />

      <View style={styles.parts}>
        <SectionLabel>Voice part</SectionLabel>
        {VOICE_PART_OPTIONS.map((opt) => (
          <SelectableOption
            key={opt.label}
            label={opt.label}
            selected={chosen && voicePart === opt.value}
            onPress={() => setVoicePart(opt.value)}
          />
        ))}
        <AppText variant="caption" color={tokens.color.inkTertiary}>
          Not sure? Pick “Not sure” — your leader can set it later.
        </AppText>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  parts: {
    gap: tokens.spacing.s2,
  },
});
