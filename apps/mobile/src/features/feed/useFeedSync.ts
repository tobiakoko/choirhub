// Boots the sync engine for the session and keeps it in step with the app
// lifecycle. The feed is the first live consumer, so it owns bring-up: stamp the
// profile id (for optimistic rows), rehydrate the outbox, then register the
// launch/foreground/push triggers (§6.1). Tearing down on unmount clears the
// profile id so a re-login re-stamps cleanly.

import { useEffect } from 'react';

import { getSyncEngine, initSync, registerSyncTriggers, setSyncProfileId } from '@/data/sync';

/** Initialize + trigger sync once the signed-in profile id is known. */
export function useFeedSync(profileId: string | undefined): void {
  useEffect(() => {
    if (!profileId) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;

    setSyncProfileId(profileId);
    void initSync().then(() => {
      if (cancelled) return;
      // registerSyncTriggers fires the launch sync itself.
      dispose = registerSyncTriggers(getSyncEngine());
    });

    return () => {
      cancelled = true;
      dispose?.();
      setSyncProfileId(null);
    };
  }, [profileId]);
}
