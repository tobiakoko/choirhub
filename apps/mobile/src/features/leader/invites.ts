// Invite-code generation + framing for the member-management invite generator
// (§5 onboarding: location-scoped, expiring, revocable, QR). Pure helpers only —
// minting the code is an authorized insert into invite_codes (useInviteCodes),
// gated by RLS to the location's leader; this module just produces a human-typable
// code string, the deep link the QR encodes, and the default expiry.

/**
 * Unambiguous code alphabet: no O/0, I/1, or other look-alikes, so a senior
 * reading a code off a screen onto a keypad never mistypes (§ multigenerational
 * audience). Matches the server format check (upper-case, length 4–32).
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/** Deterministic when handed an rng — the test passes a seeded one. Defaults to
 *  Math.random for production. */
export function generateInviteCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Codes are stored + compared upper-case, 4–32 chars (server check constraint). */
export function isValidCodeFormat(code: string): boolean {
  return code === code.toUpperCase() && code.length >= 4 && code.length <= 32 && /^[A-Z0-9]+$/.test(code);
}

/** Default life of a freshly minted code: seven days (§5 "expiring"). */
export const DEFAULT_INVITE_TTL_DAYS = 7;

export function defaultInviteExpiry(now: Date = new Date()): string {
  const expiry = new Date(now.getTime() + DEFAULT_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return expiry.toISOString();
}

/** The deep link a QR encodes — scanning it routes a new member straight into the
 *  invite step with the code prefilled (onboarding, §5). Kept in sync with the
 *  app scheme; the code is upper-cased for the case-insensitive server lookup. */
export function inviteJoinUri(code: string): string {
  return `choirhub://join?code=${encodeURIComponent(code.toUpperCase())}`;
}

/** Whether a minted code is still usable right now (not expired, not revoked, not
 *  exhausted) — mirrors the server's validate_invite_code checks for the list UI. */
export interface InviteCodeView {
  code: string;
  expiresAt: string;
  maxUses: number;
  uses: number;
  revokedAt: string | null;
}

export function isCodeLive(code: InviteCodeView, now: Date = new Date()): boolean {
  return (
    code.revokedAt === null &&
    new Date(code.expiresAt).getTime() > now.getTime() &&
    code.uses < code.maxUses
  );
}
