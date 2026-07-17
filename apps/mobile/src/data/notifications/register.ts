// Push-token registration (§6.3). Asks for permission, fetches the Expo push
// token, and binds it to the signed-in member through the register_push_token RPC
// (0013) — the token table is written server-side so RLS/ownership stay the single
// enforcement point. A stable per-install id lets a re-registration replace the
// device's prior row instead of piling up stale tokens.

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { supabase } from '@/data/supabase';
import { uuidv4 } from '@/data/uuid';

import type { PushPlatform } from './types';

const DEVICE_ID_KEY = 'push.device_id';

/** A UUID minted once per install, persisted in the keystore. */
export async function getInstallId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = uuidv4();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

function platform(): PushPlatform {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
}

/** EAS project id (required by getExpoPushTokenAsync in SDK 49+). */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export type RegisterResult =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'error'; error: unknown };

/**
 * Request permission and register this device's push token for the given member.
 * Returns a discriminated result rather than throwing so the settings screen can
 * reflect the exact state (denied vs. unsupported vs. error).
 */
export async function registerPushToken(): Promise<RegisterResult> {
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return { status: 'denied' };

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    const deviceId = await getInstallId();

    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: platform(),
      p_device_id: deviceId,
    });
    if (error) return { status: 'error', error };

    return { status: 'registered', token };
  } catch (error) {
    return { status: 'error', error };
  }
}

/** Revoke this device's token server-side (member turned notifications off). */
export async function deactivatePushToken(token: string): Promise<void> {
  await supabase.rpc('deactivate_push_token', { p_token: token });
}
