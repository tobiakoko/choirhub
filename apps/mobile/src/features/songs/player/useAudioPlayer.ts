// The expo-av bridge for the repertoire player. Resolves a cache-first source
// (local file in airplane mode, else network), loads it into an Audio.Sound, and
// exposes the small surface the AudioPlayer component needs: play/pause, seek,
// speed, and an armed A–B loop that seeks back to A when playback reaches B.
//
// All playback maths live in playback.ts (pure, tested). This hook only owns the
// native sound object + its status subscription.

import { Audio, type AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getMediaCache, type AudioAssetRef } from '@/data/media';

import {
  cycleAbLoop,
  EMPTY_LOOP,
  loopSeekTarget,
  nextSpeed,
  positionForFraction,
  type AbLoop,
  type PlaybackSpeed,
} from './playback';

export interface AudioPlayerState {
  loaded: boolean;
  playing: boolean;
  /** Playback is reading from a cached local file (offline-safe). */
  fromCache: boolean;
  /** No cached file and no network — nothing to play. */
  unavailable: boolean;
  positionMillis: number;
  durationMillis: number | undefined;
  speed: PlaybackSpeed;
  loop: AbLoop;
}

export interface AudioPlayerControls extends AudioPlayerState {
  toggle: () => Promise<void>;
  seekToFraction: (fraction: number) => Promise<void>;
  cycleSpeed: () => Promise<void>;
  toggleAbLoop: () => void;
}

const INITIAL: AudioPlayerState = {
  loaded: false,
  playing: false,
  fromCache: false,
  unavailable: false,
  positionMillis: 0,
  durationMillis: undefined,
  speed: 1,
  loop: EMPTY_LOOP,
};

/**
 * Drive a single asset's audio. `asset` may be null (nothing selected). The sound
 * is unloaded on unmount/asset change; the A–B loop is enforced in the status
 * callback via `loopSeekTarget`.
 */
export function useAudioPlayer(asset: AudioAssetRef | null): AudioPlayerControls {
  const soundRef = useRef<Audio.Sound | null>(null);
  const loopRef = useRef<AbLoop>(EMPTY_LOOP);
  const speedRef = useRef<PlaybackSpeed>(1);
  const [state, setState] = useState<AudioPlayerState>(INITIAL);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setState((prev) => ({ ...prev, loaded: false }));
      return;
    }
    // Enforce the A–B loop: at/after B, jump back to A.
    const target = loopSeekTarget(status.positionMillis, loopRef.current);
    if (target != null) {
      void soundRef.current?.setPositionAsync(target);
    }
    setState((prev) => ({
      ...prev,
      loaded: true,
      playing: status.isPlaying,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loopRef.current = EMPTY_LOOP;
    speedRef.current = 1;
    setState(INITIAL);

    if (!asset) return;

    (async () => {
      const source = await getMediaCache().resolveSource(asset);
      if (cancelled) return;
      if (source.kind === 'unavailable') {
        setState((prev) => ({ ...prev, unavailable: true }));
        return;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: source.uri },
        { shouldPlay: false },
        onStatus
      );
      if (cancelled) {
        void sound.unloadAsync();
        return;
      }
      soundRef.current = sound;
      void getMediaCache().touch(asset);
      setState((prev) => ({ ...prev, loaded: true, fromCache: source.kind === 'local' }));
    })();

    return () => {
      cancelled = true;
      const sound = soundRef.current;
      soundRef.current = null;
      void sound?.unloadAsync();
    };
  }, [asset, onStatus]);

  const toggle = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) await sound.pauseAsync();
    else await sound.playAsync();
  }, []);

  const seekToFraction = useCallback(async (fraction: number) => {
    const sound = soundRef.current;
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    await sound.setPositionAsync(positionForFraction(fraction, status.durationMillis));
  }, []);

  const cycleSpeed = useCallback(async () => {
    const next = nextSpeed(speedRef.current);
    speedRef.current = next;
    setState((prev) => ({ ...prev, speed: next }));
    // Correct pitch so slowed-down practice stays in tune.
    await soundRef.current?.setRateAsync(next, true);
  }, []);

  const toggleAbLoop = useCallback(() => {
    const next = cycleAbLoop(loopRef.current, state.positionMillis);
    loopRef.current = next;
    setState((prev) => ({ ...prev, loop: next }));
  }, [state.positionMillis]);

  return { ...state, toggle, seekToFraction, cycleSpeed, toggleAbLoop };
}
