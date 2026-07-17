import { AppText, GhostButton, GradientButton, Sheet, tokens } from '@choirhub/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useViewer } from '@/features/feed/useViewer';

import {
  canAdvance,
  canPublish,
  type ComposeState,
  type ComposeStep,
  initialComposeState,
  isLastStep,
  nextStep,
  prevStep,
  toggleScope,
  toPublishInput,
} from '../composeModel';
import { useLeaderRole } from '../useLeaderRole';
import { usePostableScopes } from '../usePostableScopes';
import { usePublishAnnouncement } from '../usePublishAnnouncement';
import { AudienceStep } from './AudienceStep';
import { ComposeStepper } from './ComposeStepper';
import { DeliveryStep } from './DeliveryStep';
import { PreviewStep } from './PreviewStep';
import { WriteStep } from './WriteStep';

export type ComposeSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/** Human-readable failure copy for the errors publish can surface. */
function publishErrorCopy(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // An RLS rejection on the audiences insert (out-of-scope target the server
  // refused) surfaces as a Postgres 42501 / policy violation.
  if (/row-level security|42501|violates/i.test(message)) {
    return 'One of the audiences is outside what you can post to. Adjust and try again.';
  }
  return 'Could not publish. Check your connection and try again.';
}

/**
 * The leader compose wizard (§ leader UI): Write → Audience → Delivery → Preview →
 * publish, in a bottom sheet (system design §3.5 — compose is a sheet, not a
 * screen). Holds one ComposeState and drives it through the pure composeModel;
 * publishing writes straight to Postgres where RLS re-checks every audience.
 */
export function ComposeSheet({ visible, onClose }: ComposeSheetProps) {
  const { capabilities } = useLeaderRole();
  const { scopes, loading } = usePostableScopes(visible);
  const { resolved } = useViewer();
  const publish = usePublishAnnouncement();

  const [step, setStep] = useState<ComposeStep>('write');
  const [state, setState] = useState<ComposeState>(initialComposeState);

  function patch(p: Partial<ComposeState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function reset() {
    setStep('write');
    setState(initialComposeState());
    publish.reset();
  }

  function close() {
    reset();
    onClose();
  }

  async function onPublish() {
    try {
      await publish.mutateAsync(toPublishInput(state, scopes));
      close();
    } catch {
      // Error surfaced below via publish.isError; the draft is preserved.
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      snapPoints={['90%']}
      scrollable
      accessibilityLabel="Compose announcement"
    >
      <View style={styles.container}>
        <AppText variant="heading2">New announcement</AppText>
        <ComposeStepper current={step} />

        {step === 'write' ? <WriteStep state={state} onChange={patch} /> : null}
        {step === 'audience' ? (
          <AudienceStep
            state={state}
            scopes={scopes}
            loading={loading}
            onToggle={(scope) => setState((s) => toggleScope(s, scope))}
          />
        ) : null}
        {step === 'delivery' ? (
          <DeliveryStep state={state} canSetCritical={capabilities.canSetCritical} onChange={patch} />
        ) : null}
        {step === 'preview' ? (
          <PreviewStep state={state} scopes={scopes} authorName={resolved?.displayName ?? null} />
        ) : null}

        {publish.isError ? (
          <AppText variant="bodySm" color={tokens.color.statusCritical}>
            {publishErrorCopy(publish.error)}
          </AppText>
        ) : null}

        <View style={styles.footer}>
          {step !== 'write' ? (
            <GhostButton label="Back" onPress={() => setStep((s) => prevStep(s))} />
          ) : (
            <View style={styles.spacer} />
          )}
          {isLastStep(step) ? (
            <GradientButton
              label={publish.isPending ? 'Publishing…' : 'Publish'}
              onPress={onPublish}
              disabled={!canPublish(state) || publish.isPending}
            />
          ) : (
            <GradientButton
              label="Next"
              onPress={() => setStep((s) => nextStep(s))}
              disabled={!canAdvance(step, state)}
            />
          )}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.s3,
    paddingTop: tokens.spacing.s2,
  },
  spacer: {
    flex: 0,
  },
});
