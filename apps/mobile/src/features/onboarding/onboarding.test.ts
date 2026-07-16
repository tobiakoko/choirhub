import { mapOnboardingError } from './errors';
import { COUNTRIES, DEFAULT_COUNTRY, isValidE164, toE164 } from './phone';
import { VOICE_PART_OPTIONS } from './voiceParts';

describe('phone', () => {
  it('defaults to the US (+1) and lists Nigeria (+234) prominently second', () => {
    expect(DEFAULT_COUNTRY.code).toBe('US');
    expect(DEFAULT_COUNTRY.dialCode).toBe('1');
    expect(COUNTRIES[1].code).toBe('NG');
    expect(COUNTRIES[1].dialCode).toBe('234');
  });

  it('builds E.164 from a US national number', () => {
    expect(toE164('1', '(202) 555-0143')).toBe('+12025550143');
  });

  it('strips a leading trunk 0 for Nigerian numbers', () => {
    expect(toE164('234', '0803 123 4567')).toBe('+2348031234567');
  });

  it('validates E.164 length bounds', () => {
    expect(isValidE164('+12025550143')).toBe(true);
    expect(isValidE164('+2348031234567')).toBe(true);
    expect(isValidE164('+1')).toBe(false);
    expect(isValidE164('2025550143')).toBe(false);
  });
});

describe('voiceParts', () => {
  it('offers the four parts plus a null "Not sure"', () => {
    expect(VOICE_PART_OPTIONS.map((o) => o.value)).toEqual([
      'soprano',
      'alto',
      'tenor',
      'bass',
      null,
    ]);
    expect(VOICE_PART_OPTIONS.at(-1)?.label).toBe('Not sure');
  });
});

describe('mapOnboardingError', () => {
  it('maps each invite failure to recoverable copy', () => {
    expect(mapOnboardingError({ message: 'INVITE_INVALID' }).reason).toBe('invalid');
    expect(mapOnboardingError({ message: 'INVITE_EXPIRED' }).reason).toBe('expired');
    expect(mapOnboardingError({ message: 'INVITE_EXHAUSTED' }).reason).toBe('exhausted');
    expect(mapOnboardingError({ message: 'INVITE_REVOKED' }).reason).toBe('revoked');
  });

  it('recognises network errors', () => {
    expect(mapOnboardingError({ message: 'Network request failed' }).reason).toBe('network');
  });

  it('falls back to a generic, recoverable message', () => {
    const mapped = mapOnboardingError(new Error('boom'));
    expect(mapped.reason).toBe('unknown');
    expect(mapped.message).toMatch(/location leader/i);
  });
});
