/**
 * Phone-entry helpers for the onboarding start screen (§5). The choir spans the
 * US (+1, the default) and Nigeria (+234, surfaced prominently) — both lead the
 * country list; a short tail covers other corridors members travel through.
 */

export type Country = {
  /** ISO 3166-1 alpha-2, used as a stable key. */
  code: string;
  name: string;
  /** Dial code digits, no leading '+'. */
  dialCode: string;
  flag: string;
};

// Order is intentional: US first (default selection), Nigeria second (prominent).
export const COUNTRIES: readonly Country[] = [
  { code: 'US', name: 'United States', dialCode: '1', flag: '🇺🇸' },
  { code: 'NG', name: 'Nigeria', dialCode: '234', flag: '🇳🇬' },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialCode: '1', flag: '🇨🇦' },
  { code: 'GH', name: 'Ghana', dialCode: '233', flag: '🇬🇭' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

/**
 * Combine a country dial code with a nationally-typed number into E.164.
 * Non-digits are dropped and a single leading trunk '0' (how NG/GB numbers are
 * written locally) is stripped so "0803…" under +234 becomes +234803….
 */
export function toE164(dialCode: string, national: string): string {
  const dial = dialCode.replace(/\D/g, '');
  const digits = national.replace(/\D/g, '').replace(/^0+/, '');
  return `+${dial}${digits}`;
}

/** E.164 allows 8–15 digits after the '+'. Good enough to gate the OTP send. */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/** True once the national part alone looks dialable for the chosen country. */
export function isEnterablePhone(dialCode: string, national: string): boolean {
  return isValidE164(toE164(dialCode, national));
}
