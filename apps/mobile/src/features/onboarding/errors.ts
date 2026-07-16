/**
 * Maps the invite/onboarding RPC failures (0010 migration) to recoverable,
 * plain-language copy (§8 "no dead ends" — every error offers a way forward, and
 * the invite screen always shows the "Call your location leader" fallback).
 * Copy is sentence case, no jargon, per the style guide.
 */

export type OnboardingError = {
  /** Stable reason for tests/telemetry. */
  reason:
    | 'invalid'
    | 'revoked'
    | 'expired'
    | 'exhausted'
    | 'name-required'
    | 'not-authenticated'
    | 'not-authorized'
    | 'network'
    | 'unknown';
  title: string;
  message: string;
};

const BY_CODE: Record<string, OnboardingError> = {
  INVITE_INVALID: {
    reason: 'invalid',
    title: "That code didn't work",
    message: 'Check the code and try again, or ask your location leader for a fresh one.',
  },
  INVITE_REVOKED: {
    reason: 'revoked',
    title: 'That code was turned off',
    message: 'Your location leader can send you a new invite code.',
  },
  INVITE_EXPIRED: {
    reason: 'expired',
    title: 'That code has expired',
    message: 'Ask your location leader for a new invite code.',
  },
  INVITE_EXHAUSTED: {
    reason: 'exhausted',
    title: 'That code is fully used',
    message: 'Ask your location leader for a new invite code.',
  },
  NAME_REQUIRED: {
    reason: 'name-required',
    title: 'Add your name',
    message: 'Enter the name your choir knows you by so we can continue.',
  },
  NOT_AUTHENTICATED: {
    reason: 'not-authenticated',
    title: 'Verify your phone first',
    message: 'Confirm the code we texted you, then try again.',
  },
  NOT_AUTHORIZED: {
    reason: 'not-authorized',
    title: "You can't do that",
    message: 'Only a location leader can approve members.',
  },
};

/** Read the raised message off a Supabase/PostgREST-shaped error. */
function messageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message ?? '');
  }
  return '';
}

export function mapOnboardingError(error: unknown): OnboardingError {
  const raw = messageOf(error);

  for (const key of Object.keys(BY_CODE)) {
    if (raw.includes(key)) {
      return BY_CODE[key];
    }
  }

  if (/network|fetch|timeout|Failed to fetch/i.test(raw)) {
    return {
      reason: 'network',
      title: "Can't reach the server",
      message: 'Check your connection and try again. This step needs the internet.',
    };
  }

  return {
    reason: 'unknown',
    title: 'Something went wrong',
    message: 'Please try again. If it keeps happening, call your location leader.',
  };
}
