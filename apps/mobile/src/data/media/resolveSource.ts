// Where should the player read audio from right now? (system design §6.2/§6.1
// "offline is a viewing mode, not an error"). A cached file always wins — that's
// what makes airplane-mode playback during service work. Only when nothing is
// cached do we reach for the network, and only if we're actually online.

export type PlaybackSource =
  { kind: 'local'; uri: string } | { kind: 'remote'; uri: string } | { kind: 'unavailable' };

export interface ResolveInput {
  /** Local file uri for the chosen rendition, if the cache has produced one. */
  localUri: string | null;
  /** Whether that local file actually exists on disk. */
  localExists: boolean;
  /** Remote rendition url for the current network, if any. */
  remoteUrl: string | null;
  /** Live reachability — false in airplane mode / offline. */
  isOnline: boolean;
}

/**
 * Resolve the audio source with a cache-first, offline-safe policy:
 * 1. Cached file present → play it locally (works in airplane mode).
 * 2. Else online with a remote url → stream/download from the network.
 * 3. Else unavailable — the UI shows "not downloaded" rather than erroring.
 */
export function resolvePlaybackSource({
  localUri,
  localExists,
  remoteUrl,
  isOnline,
}: ResolveInput): PlaybackSource {
  if (localExists && localUri) return { kind: 'local', uri: localUri };
  if (isOnline && remoteUrl) return { kind: 'remote', uri: remoteUrl };
  return { kind: 'unavailable' };
}
