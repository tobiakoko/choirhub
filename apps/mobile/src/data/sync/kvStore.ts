// Tiny JSON key/value helpers for sync bookkeeping (the pull cursor). The
// interface matches WatermelonDB's `database.localStorage`, so the production
// wiring in createSyncEngine is a one-line wrapper and tests use the in-memory
// impl below.

import type { KeyValueStore } from './types';

export const LAST_PULLED_AT_KEY = 'sync.last_pulled_at';

export async function getLastPulledAt(kv: KeyValueStore): Promise<string | null> {
  return (await kv.get<string>(LAST_PULLED_AT_KEY)) ?? null;
}

export async function setLastPulledAt(kv: KeyValueStore, value: string): Promise<void> {
  await kv.set(LAST_PULLED_AT_KEY, value);
}

/** In-memory KeyValueStore (tests / reference impl). */
export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly map = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.has(key) ? (this.map.get(key) as T) : undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }
}
