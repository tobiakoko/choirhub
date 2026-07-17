// Production KeyValueStore: a thin wrapper over WatermelonDB's built-in
// localStorage (SQLite-backed), used for the pull cursor. Not imported by tests.

import type { Database } from '@nozbe/watermelondb';

import type { KeyValueStore } from './types';

export class WatermelonKeyValueStore implements KeyValueStore {
  constructor(private readonly database: Database) {}

  get<T>(key: string): Promise<T | undefined> {
    return this.database.localStorage.get<T>(key);
  }

  set<T>(key: string, value: T): Promise<void> {
    // localStorage only accepts JSON-serialisable values — our keys store strings.
    return this.database.localStorage.set(key, value as never);
  }

  remove(key: string): Promise<void> {
    return this.database.localStorage.remove(key);
  }
}
