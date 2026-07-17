// Wires expo-notifications into the app shell (§6.3): registers Android channels,
// binds this device's push token to the member, hydrates their prefs, and turns a
// notification tap into a deep link. Mounted once from the tabs layout (post-approval)
// so it runs no matter which tab opens first.

import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { ensureAndroidChannels } from './channels';
import { routeForNotification } from './deepLink';
import { useNotificationPrefsStore } from './prefsStore';
import { registerPushToken } from './register';
import type { NotificationPrefs } from './types';

// Foreground behaviour: show the banner + list entry; badges are unused.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Boot the notification pipeline for a signed-in member. No-ops until a profileId
 * is known; registers the token + channels exactly once per member.
 */
export function useNotifications(profileId: string | undefined): void {
  const router = useRouter();
  const load = useNotificationPrefsStore((s) => s.load);
  const registeredFor = useRef<string | null>(null);

  // Register channels + token and hydrate prefs when the member is known.
  useEffect(() => {
    if (!profileId || registeredFor.current === profileId) return;
    registeredFor.current = profileId;
    void ensureAndroidChannels();
    void registerPushToken();
    void load(profileId);
  }, [profileId, load]);

  // Route a tap (warm) to its deep link.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeForNotification(response.notification.request.content.data);
      if (route) router.push(route as Href);
    });
    return () => sub.remove();
  }, [router]);

  // Route a tap that cold-started the app.
  useEffect(() => {
    let active = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      const route = routeForNotification(response.notification.request.content.data);
      if (route) router.push(route as Href);
    });
    return () => {
      active = false;
    };
  }, [router]);
}

/** Bind the prefs store to the current member for the settings screens. */
export function useNotificationPrefs(profileId: string | undefined): {
  prefs: NotificationPrefs;
  loaded: boolean;
  update: (patch: Partial<NotificationPrefs>) => Promise<void>;
} {
  const prefs = useNotificationPrefsStore((s) => s.prefs);
  const loaded = useNotificationPrefsStore((s) => s.loaded);
  const rawUpdate = useNotificationPrefsStore((s) => s.update);
  const loadRef = useNotificationPrefsStore((s) => s.load);

  useEffect(() => {
    if (!loaded && profileId) void loadRef(profileId);
  }, [loaded, profileId, loadRef]);

  return {
    prefs,
    loaded,
    update: (patch) => rawUpdate(patch, profileId),
  };
}
