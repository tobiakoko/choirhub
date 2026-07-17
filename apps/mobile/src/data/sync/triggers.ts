// Wires the sync engine to its four triggers (§6.1): launch, foreground,
// reconnect, and inbound push. Network reachability is injected (a NetInfo
// subscription in the app) rather than hard-imported, so we add no dependency and
// the wiring stays testable. Call the returned function to tear every listener down.

import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { SyncEngine } from './syncEngine';

export interface SyncTriggerDeps {
  /**
   * Subscribe to connectivity regained events. Return an unsubscribe fn. Optional —
   * omit it and foreground still covers most reconnects. Wire it to NetInfo's
   * `addEventListener` (fire `onOnline` on an offline→online transition).
   */
  onReconnect?: (onOnline: () => void) => () => void;
}

/**
 * Start syncing and keep it in step with the app lifecycle. Returns a disposer.
 * Fires immediately (launch), on every foreground, on reconnect, and whenever a
 * push notification arrives (new content is waiting server-side).
 */
export function registerSyncTriggers(engine: SyncEngine, deps: SyncTriggerDeps = {}): () => void {
  // Launch.
  void engine.sync('launch');

  // Foreground.
  const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') void engine.sync('foreground');
  });

  // Inbound push — content changed server-side, pull it in.
  const notificationSub = Notifications.addNotificationReceivedListener(() => {
    void engine.sync('push');
  });

  // Reconnect (optional; app supplies the NetInfo subscription).
  const reconnectUnsub = deps.onReconnect?.(() => void engine.sync('reconnect'));

  return () => {
    appStateSub.remove();
    notificationSub.remove();
    reconnectUnsub?.();
  };
}
