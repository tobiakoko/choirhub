// expo-network adapter: collapse the platform network state into the app's
// NetworkType (system design §6.2). Isolated here so the rendition/download policy
// stays pure and testable and only this file knows about expo-network.

import * as Network from 'expo-network';

import type { NetworkType } from './types';

export async function getNetworkType(): Promise<NetworkType> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false) return 'none';
    switch (state.type) {
      case Network.NetworkStateType.WIFI:
      case Network.NetworkStateType.ETHERNET:
        return 'wifi';
      case Network.NetworkStateType.CELLULAR:
        return 'cellular';
      case Network.NetworkStateType.NONE:
        return 'none';
      default:
        return 'unknown';
    }
  } catch {
    // A failed probe must not brick playback; assume offline and fall back to cache.
    return 'unknown';
  }
}

export async function isOnline(): Promise<boolean> {
  const type = await getNetworkType();
  return type === 'wifi' || type === 'cellular';
}
