import {
  defaultInviteExpiry,
  generateInviteCode,
  type InviteCodeView,
  inviteJoinUri,
  isCodeLive,
  isValidCodeFormat,
} from './invites';

/** A deterministic rng cycling through fixed values for reproducible codes. */
function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('generateInviteCode', () => {
  it('produces an 8-char code from the unambiguous alphabet', () => {
    const code = generateInviteCode(seededRng([0, 0.5, 0.99, 0.2, 0.1, 0.7, 0.3, 0.8]));
    expect(code).toHaveLength(8);
    expect(isValidCodeFormat(code)).toBe(true);
  });

  it('never emits look-alike characters (O, 0, I, 1)', () => {
    const code = generateInviteCode(seededRng([0.01, 0.99, 0.5, 0.33, 0.66, 0.12, 0.87, 0.45]));
    expect(code).not.toMatch(/[O0I1]/);
  });
});

describe('isValidCodeFormat', () => {
  it('accepts upper-case alphanumerics of a sane length', () => {
    expect(isValidCodeFormat('DCJOIN01')).toBe(true);
  });
  it('rejects lower-case, symbols, or too-short codes', () => {
    expect(isValidCodeFormat('dcjoin')).toBe(false);
    expect(isValidCodeFormat('AB')).toBe(false);
    expect(isValidCodeFormat('AB-CD')).toBe(false);
  });
});

describe('defaultInviteExpiry', () => {
  it('is seven days out from now', () => {
    const now = new Date('2026-07-17T00:00:00.000Z');
    expect(defaultInviteExpiry(now)).toBe('2026-07-24T00:00:00.000Z');
  });
});

describe('inviteJoinUri', () => {
  it('encodes an upper-cased code into the app deep link', () => {
    expect(inviteJoinUri('dcjoin01')).toBe('choirhub://join?code=DCJOIN01');
  });
});

describe('isCodeLive', () => {
  const base: InviteCodeView = {
    code: 'DCJOIN01',
    expiresAt: '2026-07-24T00:00:00.000Z',
    maxUses: 25,
    uses: 3,
    revokedAt: null,
  };
  const now = new Date('2026-07-18T00:00:00.000Z');

  it('is live when unexpired, unrevoked, and under max uses', () => {
    expect(isCodeLive(base, now)).toBe(true);
  });
  it('is dead once revoked', () => {
    expect(isCodeLive({ ...base, revokedAt: '2026-07-17T00:00:00.000Z' }, now)).toBe(false);
  });
  it('is dead once expired', () => {
    expect(isCodeLive({ ...base, expiresAt: '2026-07-01T00:00:00.000Z' }, now)).toBe(false);
  });
  it('is dead once fully used', () => {
    expect(isCodeLive({ ...base, uses: 25 }, now)).toBe(false);
  });
});
