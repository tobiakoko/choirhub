// Android notification channels (§6.3). Android routes every notification through a
// channel whose importance the user ultimately controls, so we declare three that
// mirror our priority tiers — critical (heads-up + sound), default (standard push),
// silent (digest, no sound/vibration). iOS has no channel concept; these calls are
// no-ops there. Channel ids match androidChannelForPriority() in policy.ts.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AndroidChannelId } from './policy';

interface ChannelSpec {
  id: AndroidChannelId;
  name: string;
  importance: Notifications.AndroidImportance;
  sound: boolean;
  vibrate: boolean;
}

const CHANNELS: readonly ChannelSpec[] = [
  {
    id: 'critical',
    name: 'Critical alerts',
    importance: Notifications.AndroidImportance.MAX,
    sound: true,
    vibrate: true,
  },
  {
    id: 'default',
    name: 'Announcements',
    importance: Notifications.AndroidImportance.HIGH,
    sound: true,
    vibrate: true,
  },
  {
    id: 'silent',
    name: 'Daily digest',
    importance: Notifications.AndroidImportance.LOW,
    sound: false,
    vibrate: false,
  },
];

/** Register the three channels. Idempotent — safe to call on every launch. */
export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    CHANNELS.map((c) =>
      Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        importance: c.importance,
        sound: c.sound ? 'default' : null,
        vibrationPattern: c.vibrate ? [0, 250, 250, 250] : [0],
        enableVibrate: c.vibrate,
      })
    )
  );
}
