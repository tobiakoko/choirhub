import { AppText, GhostButton, tokens } from '@choirhub/ui';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type OnboardingScaffoldProps = {
  title: string;
  subtitle?: string;
  /** 1-based step index for the progress dots. */
  step?: number;
  totalSteps?: number;
  /** Back affordance; omit on the first step. */
  onBack?: () => void;
  children: ReactNode;
  /** Bottom-anchored action area (primary CTA), reachable by thumb. */
  footer?: ReactNode;
};

/**
 * Shared onboarding layout: slate canvas, generous margins, a scrollable body
 * that flexes under the keyboard, and a bottom-anchored footer for the primary
 * action (design system: bottom-heavy, thumb-reachable CTAs). Built from
 * primitives + tokens only.
 */
export function OnboardingScaffold({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
  children,
  footer,
}: OnboardingScaffoldProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {onBack ? (
            <View style={styles.backRow}>
              <GhostButton label="Back" onPress={onBack} accessibilityLabel="Go back" />
            </View>
          ) : null}

          {step && totalSteps ? (
            <View
              style={styles.dots}
              accessibilityRole="progressbar"
              accessibilityLabel={`Step ${step} of ${totalSteps}`}
            >
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < step ? styles.dotOn : styles.dotOff]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.header}>
            <AppText variant="heading1">{title}</AppText>
            {subtitle ? (
              <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
                {subtitle}
              </AppText>
            ) : null}
          </View>

          <View style={styles.body}>{children}</View>
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.spacing.s4,
    paddingTop: tokens.spacing.s4,
    paddingBottom: tokens.spacing.s8,
    gap: tokens.spacing.s6,
  },
  backRow: {
    alignItems: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
    gap: tokens.spacing.s2,
  },
  dot: {
    height: tokens.spacing.s1,
    flex: 1,
    borderRadius: tokens.radii.full,
  },
  dotOn: {
    backgroundColor: tokens.color.interactiveBase,
  },
  dotOff: {
    backgroundColor: tokens.color.hairline,
  },
  header: {
    gap: tokens.spacing.s2,
  },
  body: {
    gap: tokens.spacing.s4,
  },
  footer: {
    paddingHorizontal: tokens.spacing.s4,
    paddingTop: tokens.spacing.s3,
    paddingBottom: tokens.spacing.s4,
    gap: tokens.spacing.s3,
  },
});
