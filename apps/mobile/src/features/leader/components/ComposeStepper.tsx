import { AppText, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';

import { COMPOSE_STEPS, type ComposeStep, stepIndex } from '../composeModel';

const STEP_LABELS: Record<ComposeStep, string> = {
  write: 'Write',
  audience: 'Audience',
  delivery: 'Delivery',
  preview: 'Preview',
};

export type ComposeStepperProps = { current: ComposeStep };

/**
 * The compose wizard's progress rail: one segment per step (Write · Audience ·
 * Delivery · Preview), filled up to and including the current one. Communicates
 * "where am I / how much is left" at a glance.
 */
export function ComposeStepper({ current }: ComposeStepperProps) {
  const currentIndex = stepIndex(current);

  return (
    <View style={styles.row} accessibilityLabel={`Step ${currentIndex + 1} of ${COMPOSE_STEPS.length}`}>
      {COMPOSE_STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <View key={step} style={styles.segment}>
            <View style={[styles.bar, reached ? styles.barOn : styles.barOff]} />
            <AppText
              variant="caption"
              color={index === currentIndex ? tokens.color.interactiveBase : tokens.color.inkTertiary}
            >
              {STEP_LABELS[step]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.s2,
  },
  segment: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
  bar: {
    height: tokens.size.sheetHandleHeight,
    borderRadius: tokens.radii.full,
  },
  barOn: {
    backgroundColor: tokens.color.interactiveBase,
  },
  barOff: {
    backgroundColor: tokens.color.hairline,
  },
});
