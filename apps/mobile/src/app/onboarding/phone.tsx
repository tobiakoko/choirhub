import {
  AppText,
  GradientButton,
  SelectableOption,
  Sheet,
  TextField,
  tokens,
} from '@choirhub/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/features/onboarding/components/OnboardingScaffold';
import { mapOnboardingError } from '@/features/onboarding/errors';
import { useSendOtp } from '@/features/onboarding/api';
import { COUNTRIES, DEFAULT_COUNTRY, isEnterablePhone, toE164 } from '@/features/onboarding/phone';
import { useOnboardingStore } from '@/features/onboarding/store';

export default function PhoneScreen() {
  const router = useRouter();
  const setDraft = useOnboardingStore((s) => s.set);
  const sendOtp = useSendOtp();

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const ready = isEnterablePhone(country.dialCode, national);

  async function onSend() {
    setError(undefined);
    const phone = toE164(country.dialCode, national);
    try {
      await sendOtp.mutateAsync(phone);
      setDraft({ phone, dialCode: country.dialCode });
      router.push('/onboarding/verify');
    } catch (e) {
      setError(mapOnboardingError(e).message);
    }
  }

  return (
    <OnboardingScaffold
      step={1}
      totalSteps={5}
      title="Enter your phone number"
      subtitle="We'll text you a code to sign in. No password to remember."
      footer={
        <GradientButton
          label={sendOtp.isPending ? 'Sending…' : 'Send code'}
          onPress={onSend}
          disabled={!ready || sendOtp.isPending}
          accessibilityLabel="Send verification code"
        />
      }
    >
      <TextField
        label="Phone number"
        value={national}
        onChangeText={(t) => {
          setNational(t);
          setError(undefined);
        }}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        autoFocus
        placeholder="(202) 555-0143"
        error={error}
        leading={
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Country: ${country.name}, dial code plus ${country.dialCode}`}
            style={styles.dial}
          >
            <AppText variant="bodyMd">{country.flag}</AppText>
            <AppText variant="bodyMd" color={tokens.color.interactiveBase}>
              +{country.dialCode}
            </AppText>
          </Pressable>
        }
      />

      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        accessibilityLabel="Choose your country"
      >
        <AppText variant="heading2">Choose your country</AppText>
        <View style={styles.countryList}>
          {COUNTRIES.map((c) => (
            <SelectableOption
              key={c.code}
              label={`${c.flag}  ${c.name}`}
              description={`+${c.dialCode}`}
              selected={c.code === country.code}
              onPress={() => {
                setCountry(c);
                setPickerOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  dial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s1,
    minHeight: tokens.size.touchTarget,
    paddingRight: tokens.spacing.s2,
    borderRightWidth: tokens.borderWidth.hairline,
    borderRightColor: tokens.color.hairline,
  },
  countryList: {
    gap: tokens.spacing.s2,
    marginTop: tokens.spacing.s4,
  },
});
