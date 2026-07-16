import * as SecureStore from 'expo-secure-store';

/**
 * Supabase session persistence backed by expo-secure-store (CLAUDE.md §8 —
 * identity is a phone-OTP session; keep it in the device keystore, never
 * AsyncStorage). SecureStore caps a single value at ~2048 bytes, and a Supabase
 * session (access + refresh token + user) can exceed that, so values are split
 * into chunks across several keychain entries and reassembled on read.
 */

// Stay comfortably under SecureStore's ~2048-byte per-value ceiling.
export const CHUNK_SIZE = 1800;

/** Split a string into <=size chunks. An empty string yields a single empty chunk. */
export function splitChunks(value: string, size = CHUNK_SIZE): string[] {
  if (value.length <= size) {
    return [value];
  }
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

const countKey = (key: string) => `${key}.__parts`;
const partKey = (key: string, i: number) => `${key}.__part.${i}`;

async function removeAll(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(countKey(key));
  if (countRaw != null) {
    const count = Number.parseInt(countRaw, 10);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.deleteItemAsync(partKey(key, i));
    }
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

/**
 * The storage interface Supabase Auth expects (getItem/setItem/removeItem).
 * Chunk keys are namespaced under the caller's key so multiple sessions coexist.
 */
export const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const countRaw = await SecureStore.getItemAsync(countKey(key));
    if (countRaw == null) {
      return null;
    }
    const count = Number.parseInt(countRaw, 10);
    let out = '';
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(partKey(key, i));
      if (part == null) {
        // A missing chunk means the stored value is corrupt; treat as absent.
        return null;
      }
      out += part;
    }
    return out;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Clear any prior (possibly longer) value so no stale chunks linger.
    await removeAll(key);
    const chunks = splitChunks(value);
    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(partKey(key, i), chunks[i]);
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
  },

  removeItem: async (key: string): Promise<void> => {
    await removeAll(key);
  },
};
