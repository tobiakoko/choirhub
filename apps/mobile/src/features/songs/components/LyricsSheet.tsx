import { AppText, Sheet, color, radii, spacing, typography } from '@choirhub/ui';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { clampTextScale, TEXT_SCALE_MIN } from '../textScale';
import { TextScaleSlider } from './TextScaleSlider';

/** Cross-platform monospace face for tonic solfa, so `d r m f s l t` columns line
 *  up (spec: "solfa renders monospace"). */
const MONO = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

export type LyricsMode = 'lyrics' | 'solfa';

export type LyricsSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  lyrics: string | null;
  solfa: string | null;
  initialMode?: LyricsMode;
};

/**
 * Lyrics / tonic-solfa reader (design system §7.4, §2.3). Opens in the Sheet
 * primitive — never a screen push — with its own text-scale slider (1.0–1.8×) for
 * active rehearsal use. Solfa renders monospace so the sol-fa columns align. The
 * sheet inherits spring-fluid entry and reduced-motion degradation from `Sheet`.
 */
export function LyricsSheet({
  visible,
  onClose,
  title,
  lyrics,
  solfa,
  initialMode,
}: LyricsSheetProps) {
  const [mode, setMode] = useState<LyricsMode>(initialMode ?? (lyrics ? 'lyrics' : 'solfa'));
  const [scale, setScale] = useState(TEXT_SCALE_MIN);

  const content = mode === 'solfa' ? solfa : lyrics;
  const base = typography.role.bodyLg;
  const textStyle = {
    fontFamily: mode === 'solfa' ? MONO : base.fontFamily,
    fontSize: base.fontSize * scale,
    lineHeight: base.lineHeight * scale,
    color: color.inkPrimary,
  };

  const modes: LyricsMode[] = [
    ...(lyrics ? (['lyrics'] as const) : []),
    ...(solfa ? (['solfa'] as const) : []),
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      snapPoints={['85%']}
      scrollable
      accessibilityLabel={`${title} ${mode}`}
    >
      <AppText variant="heading2">{title}</AppText>

      {modes.length > 1 ? (
        <View style={styles.segmented}>
          {modes.map((m) => {
            const active = m === mode;
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={m === 'solfa' ? 'Tonic solfa' : 'Lyrics'}
                onPress={() => setMode(m)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <AppText variant="bodySm" color={active ? color.onColor : color.interactiveBase}>
                  {m === 'solfa' ? 'Solfa' : 'Lyrics'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.sliderRow}>
        <TextScaleSlider scale={scale} onChange={(next) => setScale(clampTextScale(next))} />
      </View>

      {content ? (
        <Text allowFontScaling style={textStyle}>
          {content}
        </Text>
      ) : (
        <AppText variant="bodyMd" color={color.inkSecondary}>
          {'Not available yet'}
        </AppText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    gap: spacing.s2,
    marginTop: spacing.s3,
  },
  segment: {
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s4,
    borderRadius: radii.full,
    backgroundColor: color.interactiveGhost,
  },
  segmentActive: {
    backgroundColor: color.interactiveBase,
  },
  sliderRow: {
    marginTop: spacing.s4,
    marginBottom: spacing.s4,
  },
});
