// expo-battery adapter: is the phone charging? The rehearsal-pack prefetch only
// runs on Wi-Fi *and* charging so it never drains a member's battery overnight
// (system design §6.2). Isolated so the prefetch policy stays pure.

import * as Battery from 'expo-battery';

export async function isCharging(): Promise<boolean> {
  try {
    const state = await Battery.getBatteryStateAsync();
    return state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
  } catch {
    // Unknown power state → treat as not charging so we err toward *not* prefetching.
    return false;
  }
}
