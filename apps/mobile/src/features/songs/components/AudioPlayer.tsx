import { AppText, OfflinePill, color, gradient, opacity, radii, size, spacing } from '@choirhub/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  type DimensionValue,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  audioAssetRef,
  formatBytes,
  formatClock,
  getMediaCache,
  parseRenditions,
  renditionBytes,
  selectRendition,
} from '@/data/media';

import { isLooping, progressFraction } from '../player/playback';
import { useAudioPlayer } from '../player/useAudioPlayer';
import type { RepertoireAudioPart } from '../songsModel';

export type AudioPlayerProps = {
  part: RepertoireAudioPart;
  /** Human label for the part being played, e.g. "TENOR" — for a11y + size row. */
  partLabel: string;
};

/**
 * The card's integrated player (design system §7.2): a gradient circular play
 * control, a cyan-gradient progress bar with press-to-seek and A–B loop markers,
 * 0.5×/0.75×/1× speed, and an explicit download size that becomes an OfflinePill
 * once the rendition is cached. Renders a local file in airplane mode.
 */
export function AudioPlayer({ part, partLabel }: AudioPlayerProps) {
  // Stable across renders so the player effect doesn't reload the sound each frame.
  const asset = useMemo(
    () => audioAssetRef(part.assetId, 'part_audio', part.renditions),
    [part.assetId, part.renditions]
  );
  const player = useAudioPlayer(asset);
  const [cached, setCached] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  // The stated download size (§6.2 "Every download states its size"): the lean
  // Opus rendition members actually cache on the go — reuses the tested selector.
  const opus = selectRendition(parseRenditions(part.renditions), {
    networkType: 'cellular',
    dataSaver: false,
  });
  const sizeLabel = opus ? formatBytes(renditionBytes(opus.rendition)) : '—';
  const codecLabel = opus ? opus.rendition.codec.toUpperCase() : '';

  useEffect(() => {
    let active = true;
    getMediaCache()
      .isCached(asset)
      .then((value) => {
        if (active) setCached(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part.assetId]);

  const fraction = progressFraction(player.positionMillis, player.durationMillis);
  const looping = isLooping(player.loop);
  const showOffline = cached || player.fromCache;

  const onSeek = (event: GestureResponderEvent) => {
    if (trackWidth <= 0) return;
    void player.seekToFraction(event.nativeEvent.locationX / trackWidth);
  };
  const onTrackLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  const marker = (value: number | null): DimensionValue | null =>
    value != null && player.durationMillis
      ? `${progressFraction(value, player.durationMillis) * 100}%`
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: player.unavailable }}
          accessibilityLabel={player.playing ? `Pause ${partLabel}` : `Play ${partLabel}`}
          disabled={player.unavailable}
          onPress={player.toggle}
          style={styles.playHit}
        >
          <LinearGradient
            colors={gradient.actionPrimary.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.playCircle, player.unavailable && styles.playDisabled]}
          >
            <AppText variant="bodyLg" color={color.onColor}>
              {player.playing ? '❚❚' : '▶'}
            </AppText>
          </LinearGradient>
        </Pressable>

        <View style={styles.body}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={`Seek ${partLabel}`}
            onPress={onSeek}
            onLayout={onTrackLayout}
            style={styles.track}
          >
            <View style={styles.trackFillWrap}>
              <LinearGradient
                colors={gradient.actionSecondary.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.trackFill, { width: `${fraction * 100}%` }]}
              />
            </View>
            {marker(player.loop.a) ? (
              <View style={[styles.abMarker, { left: marker(player.loop.a) ?? undefined }]} />
            ) : null}
            {marker(player.loop.b) ? (
              <View style={[styles.abMarker, { left: marker(player.loop.b) ?? undefined }]} />
            ) : null}
          </Pressable>

          <View style={styles.metaRow}>
            <AppText variant="caption" color={color.inkSecondary}>
              {`${formatClock(player.positionMillis)} / ${formatClock(player.durationMillis)}`}
            </AppText>
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Playback speed ${player.speed}×`}
                onPress={player.cycleSpeed}
                style={styles.chip}
              >
                <AppText variant="bodySm" color={color.interactiveBase}>
                  {`${player.speed}×`}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: looping }}
                accessibilityLabel={looping ? 'Clear A–B loop' : 'Set A–B loop point'}
                onPress={player.toggleAbLoop}
                style={[styles.chip, looping && styles.chipActive]}
              >
                <AppText variant="bodySm" color={looping ? color.onColor : color.interactiveBase}>
                  {'A–B'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sizeRow}>
        {showOffline ? (
          <OfflinePill />
        ) : (
          <AppText variant="caption" color={color.inkSecondary}>
            {codecLabel ? `${codecLabel} · ${sizeLabel}` : sizeLabel}
          </AppText>
        )}
        {player.unavailable ? (
          <AppText variant="caption" color={color.inkTertiary}>
            {'Not downloaded'}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.s2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  playHit: {
    minWidth: size.touchTarget,
    minHeight: size.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: size.playButton,
    height: size.playButton,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDisabled: {
    opacity: opacity.disabled,
  },
  body: {
    flex: 1,
    gap: spacing.s2,
  },
  track: {
    justifyContent: 'center',
    minHeight: size.touchTarget,
  },
  trackFillWrap: {
    height: size.progressTrackHeight,
    borderRadius: radii.full,
    backgroundColor: color.canvasInset,
    overflow: 'hidden',
  },
  trackFill: {
    height: size.progressTrackHeight,
    borderRadius: radii.full,
  },
  abMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: size.progressMarkerWidth,
    backgroundColor: color.interactiveBase,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  chip: {
    minHeight: size.touchTarget,
    minWidth: size.touchTarget,
    paddingHorizontal: spacing.s3,
    borderRadius: radii.full,
    backgroundColor: color.interactiveGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: color.interactiveBase,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s2,
  },
});
