// Hook backing the OfflinePill (§6.1 UI contract): exposes when we last synced and
// how many light writes are still queued. Re-renders on every engine status change.

import { useSyncExternalStore } from 'react';

import { getSyncEngine } from './createSyncEngine';
import type { SyncEngine } from './syncEngine';
import type { SyncStatus } from './types';

export interface UseSyncStatus {
  /** ISO timestamp of the last successful sync, or null if never. */
  lastSyncedAt: string | null;
  /** Queued light writes awaiting confirmation — the 🕓 count on the pill. */
  pendingCount: number;
  /** True while a pull/push is in flight. */
  syncing: boolean;
}

/**
 * Subscribe to sync status. Pass an engine in tests; defaults to the app
 * singleton so screens can just call `useSyncStatus()`.
 */
export function useSyncStatus(engine: SyncEngine = getSyncEngine()): UseSyncStatus {
  const status = useSyncExternalStore<SyncStatus>(
    (onChange) => engine.subscribe(onChange),
    () => engine.getStatus(),
    () => engine.getStatus()
  );

  return {
    lastSyncedAt: status.lastSyncedAt,
    pendingCount: status.pendingCount,
    syncing: status.state === 'syncing',
  };
}
