import { CHUNK_SIZE, secureStoreAdapter, splitChunks } from './secureStore';

// In-memory stand-in for the native keychain, enforcing the ~2048-byte ceiling
// so the test would fail if the adapter ever wrote an oversized value.
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (v.length > 2048) {
      throw new Error(`SecureStore value too large: ${v.length}`);
    }
    mockStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

beforeEach(() => mockStore.clear());

describe('splitChunks', () => {
  it('keeps a short value in one chunk', () => {
    expect(splitChunks('hello')).toEqual(['hello']);
  });

  it('splits a long value into <=CHUNK_SIZE pieces that rejoin exactly', () => {
    const value = 'x'.repeat(CHUNK_SIZE * 2 + 37);
    const chunks = splitChunks(value);
    expect(chunks).toHaveLength(3);
    expect(chunks.every((c) => c.length <= CHUNK_SIZE)).toBe(true);
    expect(chunks.join('')).toBe(value);
  });
});

describe('secureStoreAdapter', () => {
  it('round-trips a value larger than the SecureStore limit', async () => {
    const session = JSON.stringify({ token: 'a'.repeat(5000) });
    await secureStoreAdapter.setItem('sb-auth-token', session);
    expect(await secureStoreAdapter.getItem('sb-auth-token')).toBe(session);
  });

  it('returns null for an unknown key', async () => {
    expect(await secureStoreAdapter.getItem('missing')).toBeNull();
  });

  it('clears every chunk on removeItem', async () => {
    await secureStoreAdapter.setItem('k', 'y'.repeat(4000));
    await secureStoreAdapter.removeItem('k');
    expect(await secureStoreAdapter.getItem('k')).toBeNull();
    expect(mockStore.size).toBe(0);
  });

  it('does not leave stale chunks when overwriting with a shorter value', async () => {
    await secureStoreAdapter.setItem('k', 'z'.repeat(5000)); // 3 chunks
    await secureStoreAdapter.setItem('k', 'short'); // 1 chunk
    expect(await secureStoreAdapter.getItem('k')).toBe('short');
    // 1 part + 1 count key only — the two old parts are gone.
    expect(mockStore.size).toBe(2);
  });
});
