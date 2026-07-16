import { AppText, GhostButton, GradientButton, TextField, tokens } from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/features/onboarding/components/OnboardingScaffold';
import { mapOnboardingError } from '@/features/onboarding/errors';
import { useSendOtp, useVerifyOtp } from '@/features/onboarding/api';
import { useOnboardingStore } from '@/features/onboarding/store';

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const phone = useOnboardingStore((s) => s.phone);
  const verify = useVerifyOtp();
  const resend = useSendOtp();

  const [token, setToken] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [resent, setResent] = useState(false);

  const ready = token.length === OTP_LENGTH;

  async function onVerify() {
    setError(undefined);
    try {
      await verify.mutateAsync({ phone, token });
      // Session is now persisted; move to the invite step.
      router.replace('/onboarding/invite');
    } catch (e) {
      setError(mapOnboardingError(e).message);
    }
  }

  async function onResend() {
    setError(undefined);
    setResent(false);
    try {
      await resend.mutateAsync(phone);
      setResent(true);
    } catch (e) {
      setError(mapOnboardingError(e).message);
    }
  }

  return (
    <OnboardingScaffold
      step={2}
      totalSteps={5}
      title="Enter the code"
      subtitle={`We texted a ${OTP_LENGTH}-digit code to ${phone || 'your phone'}.`}
      onBack={() => router.back()}
      footer={
        <GradientButton
          label={verify.isPending ? 'Verifying…' : 'Verify'}
          onPress={onVerify}
          disabled={!ready || verify.isPending}
          accessibilityLabel="Verify the code"
        />
      }
    >
      <TextField
        label="6-digit code"
        value={token}
        onChangeText={(t) => {
          setToken(t.replace(/\D/g, '').slice(0, OTP_LENGTH));
          setError(undefined);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={OTP_LENGTH}
        placeholder="000000"
        error={error}
      />

      <View style={styles.resend}>
        <AppText variant="bodySm" color={tokens.color.inkSecondary}>
          {resent ? 'New code sent.' : "Didn't get it?"}
        </AppText>
        <GhostButton
          label={resend.isPending ? 'Sending…' : 'Resend code'}
          onPress={onResend}
          disabled={resend.isPending}
        />
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  resend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s2,
  },
});
