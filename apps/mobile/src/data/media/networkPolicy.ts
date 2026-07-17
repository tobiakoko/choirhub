// When may a heavy download run? (system design §6.2). Rendition *choice* is in
// rendition.ts; this is the *timing* gate. Under Data Saver, audio defers to
// Wi-Fi — a member on a metered 2G plan never spends data on a background fetch.

import type { NetworkContext } from './types';

export type DownloadGate =
  { allowed: true } | { allowed: false; reason: 'offline' | 'wifi-only-queue' };

/**
 * Decide whether a user-initiated audio download may proceed now.
 * - Offline → blocked (nothing to fetch from).
 * - Data Saver on a cellular/unknown link → queued until Wi-Fi (`wifi-only-queue`).
 * - Otherwise allowed.
 */
export function canDownloadNow(ctx: NetworkContext): DownloadGate {
  if (ctx.networkType === 'none') return { allowed: false, reason: 'offline' };
  if (ctx.dataSaver && ctx.networkType !== 'wifi') {
    return { allowed: false, reason: 'wifi-only-queue' };
  }
  return { allowed: true };
}

/** True when a queued (Data-Saver-deferred) download should now drain — i.e. the
 *  link has become Wi-Fi. */
export function shouldDrainQueue(ctx: NetworkContext): boolean {
  return ctx.networkType === 'wifi';
}
