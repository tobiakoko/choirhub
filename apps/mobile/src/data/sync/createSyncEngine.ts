// Composition root for the production sync engine: wires the WatermelonDB-backed
// stores, the Supabase transport, and the outbox into a single lazily-built
// singleton. Kept out of the test path — the engine itself is tested against
// in-memory ports; this file only assembles the real adapters.

import { database } from '../database';
import { supabase } from '../supabase';
import { Outbox } from './outbox';
import { SupabaseSyncTransport } from './transport';
import { SyncEngine } from './syncEngine';
import { WatermelonKeyValueStore } from './watermelonKvStore';
import { WatermelonLocalStore } from './watermelonLocalStore';
import { WatermelonOutboxStore } from './watermelonOutboxStore';

let engine: SyncEngine | null = null;
let currentProfileId: string | null = null;

/** Tell the engine whose optimistic rows to stamp (set once the session resolves). */
export function setSyncProfileId(profileId: string | null): void {
  currentProfileId = profileId;
}

/** The app-wide sync engine, built on first use. `initSync()` must be awaited
 *  once (after login) before the first sync so the outbox is rehydrated. */
export function getSyncEngine(): SyncEngine {
  if (engine) return engine;

  const outboxStore = new WatermelonOutboxStore(database);
  const outbox = new Outbox(outboxStore);
  const local = new WatermelonLocalStore(database, () => {
    if (!currentProfileId) throw new Error('setSyncProfileId must be called before syncing');
    return currentProfileId;
  });

  engine = new SyncEngine({
    transport: new SupabaseSyncTransport(supabase),
    local,
    kv: new WatermelonKeyValueStore(database),
    outbox,
  });
  return engine;
}

/** Rehydrate persisted state (outbox, cursor). Idempotent. */
export async function initSync(): Promise<void> {
  await getSyncEngine().init();
}
