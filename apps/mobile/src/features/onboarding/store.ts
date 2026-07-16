import { create } from 'zustand';

import { DEFAULT_COUNTRY } from './phone';

/**
 * In-progress onboarding data, held in memory across the step screens (phone →
 * OTP → invite → profile → pending) so we never serialize a code or phone number
 * through navigation params. Cleared once the member lands in the app.
 */
export type OnboardingDraft = {
  dialCode: string;
  phone: string; // E.164
  code: string;
  locationName: string;
  leaderName: string | null;
  leaderPhone: string | null;
};

type OnboardingStore = OnboardingDraft & {
  set: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

const initial: OnboardingDraft = {
  dialCode: DEFAULT_COUNTRY.dialCode,
  phone: '',
  code: '',
  locationName: '',
  leaderName: null,
  leaderPhone: null,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}));
