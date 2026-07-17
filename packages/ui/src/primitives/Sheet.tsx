import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetSpringConfigs,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { springFluid } from '../motion';
import { color, elevation, motion, opacity, radii, size, spacing } from '../tokens';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional fixed snap points; omit to size to content (dynamic sizing). */
  snapPoints?: (string | number)[];
  /** Render the body in a scroll view — for long content like lyrics/solfa that
   *  can exceed the sheet height. Pair with a fixed `snapPoints`. */
  scrollable?: boolean;
  accessibilityLabel?: string;
};

/**
 * Bottom-sheet modal — the app's answer to lyrics, solfa, form-filling, and
 * leader compose. Preserves spatial context instead of pushing a screen
 * (design system §7.4, system design §3.5): lg top corners, Level-4 upward
 * shadow, drag handle, and a 0.4 obsidian backdrop. Slides via spring-fluid.
 *
 * Requires <BottomSheetModalProvider> above it in the tree.
 */
export function Sheet({
  visible,
  onClose,
  children,
  snapPoints,
  scrollable,
  accessibilityLabel,
}: SheetProps) {
  const ref = useRef<BottomSheetModal>(null);

  // Slide up via spring-fluid, degrading to a short fade-timing under OS Reduce
  // Motion (design system §7.4, motion §"reduced-motion"). Both config hooks run
  // unconditionally — hooks can't be gated — and we pick per the setting.
  const reducedMotion = useReducedMotion();
  const springConfigs = useBottomSheetSpringConfigs(springFluid);
  const timingConfigs = useBottomSheetTimingConfigs({ duration: motion.reducedMotionMs });
  const animationConfigs = reducedMotion ? timingConfigs : springConfigs;

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={opacity.backdrop}
        style={[props.style, styles.backdrop]}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      onDismiss={onClose}
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      style={styles.sheet}
    >
      {scrollable ? (
        <BottomSheetScrollView
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          contentContainerStyle={styles.content}
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={styles.content}
        >
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  // Level-4 shadow, offset upward per spec.
  sheet: elevation.level4,
  backdrop: {
    backgroundColor: color.inkPrimary,
  },
  background: {
    backgroundColor: color.canvasElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  handle: {
    paddingVertical: spacing.s3,
  },
  handleIndicator: {
    width: size.sheetHandleWidth,
    height: size.sheetHandleHeight,
    backgroundColor: color.hairlineStrong,
  },
  content: {
    padding: spacing.s6,
    paddingBottom: spacing.safeBottom,
  },
});
