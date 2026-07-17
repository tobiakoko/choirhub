import { AppText, borderWidth, color, gradient, radii, size, spacing } from '@choirhub/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  fractionFromScale,
  scaleFromFraction,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  formatScale,
} from '../textScale';

export type TextScaleSliderProps = {
  scale: number;
  onChange: (scale: number) => void;
};

/**
 * The lyrics/solfa text-scale slider (design system §2.3): drag to zoom the text
 * 1.0–1.8× for active rehearsal use, independent of OS Dynamic Type. The scale
 * maths are pure (textScale.ts); this is the gesture shell. The thumb tracks the
 * finger on the UI thread and commits snapped values back to React.
 */
export function TextScaleSlider({ scale, onChange }: TextScaleSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fraction = useSharedValue(fractionFromScale(scale));

  const commit = (value: number) => onChange(scaleFromFraction(value));

  const pan = Gesture.Pan()
    .onBegin((event) => {
      if (trackWidth <= 0) return;
      fraction.value = Math.min(1, Math.max(0, event.x / trackWidth));
      runOnJS(commit)(fraction.value);
    })
    .onUpdate((event) => {
      if (trackWidth <= 0) return;
      fraction.value = Math.min(1, Math.max(0, event.x / trackWidth));
      runOnJS(commit)(fraction.value);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: `${fraction.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${fraction.value * 100}%` }));

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Text size"
      accessibilityValue={{ min: TEXT_SCALE_MIN, max: TEXT_SCALE_MAX, now: scale }}
      style={styles.container}
    >
      <AppText variant="caption" color={color.inkSecondary}>
        {'A'}
      </AppText>
      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={onLayout}>
          <View style={styles.trackBase}>
            <Animated.View style={[styles.fill, fillStyle]}>
              <LinearGradient
                colors={gradient.actionSecondary.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
      <AppText variant="heading2">{'A'}</AppText>
      <View style={styles.readout}>
        <AppText variant="bodySm" color={color.interactiveBase}>
          {formatScale(scale)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    minHeight: size.touchTarget,
  },
  track: {
    flex: 1,
    justifyContent: 'center',
    minHeight: size.touchTarget,
  },
  trackBase: {
    height: size.progressTrackHeight,
    borderRadius: radii.full,
    backgroundColor: color.canvasInset,
    overflow: 'hidden',
  },
  fill: {
    height: size.progressTrackHeight,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: size.sliderThumb,
    height: size.sliderThumb,
    borderRadius: radii.full,
    marginLeft: -size.sliderThumb / 2,
    backgroundColor: color.canvasElevated,
    borderWidth: borderWidth.hairline,
    borderColor: color.hairlineStrong,
  },
  readout: {
    minWidth: size.touchTarget,
    alignItems: 'flex-end',
  },
});
