import { AppText, tokens } from '@choirhub/ui';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnnouncementCard } from '@/features/feed/components/AnnouncementCard';
import type { FeedAnnouncement } from '@/features/feed/feedModel';

import { type ComposeState, DELIVERY_TIERS } from '../composeModel';
import { type PostableScope, scopeKey } from '../postableScopes';

export type PreviewStepProps = {
  state: ComposeState;
  scopes: PostableScope[];
  /** The author's display name, shown on the card exactly as members will see it. */
  authorName: string | null;
};

/**
 * Step 4 — Preview: renders the *real* AnnouncementCard with the composed content,
 * so what the leader approves is pixel-for-pixel what members receive. Below the
 * card, a plain summary of the audience and delivery tier confirms the reach.
 */
export function PreviewStep({ state, scopes, authorName }: PreviewStepProps) {
  const announcement = useMemo<FeedAnnouncement>(
    () => ({
      id: 'preview',
      authorId: 'preview',
      authorName,
      category: state.category,
      priority: state.tier,
      pinned: state.pin,
      requiresAck: state.requireAck,
      title: state.title.trim() || 'Untitled',
      body: state.body.trim(),
      publishAt: state.scheduleAt ?? new Date().toISOString(),
    }),
    [state, authorName]
  );

  const selectedKeys = new Set(state.selectedScopeKeys);
  const audienceLabels = scopes
    .filter((s) => selectedKeys.has(scopeKey(s)))
    .map((s) => s.label)
    .join(', ');
  const tierLabel = DELIVERY_TIERS.find((t) => t.value === state.tier)?.label ?? state.tier;

  return (
    <View style={styles.container}>
      <AppText variant="bodySm" color={tokens.color.inkSecondary}>
        Preview
      </AppText>
      <AnnouncementCard
        announcement={announcement}
        ackState="none"
        onAcknowledge={() => undefined}
      />
      <View style={styles.summary}>
        <SummaryRow label="Audience" value={audienceLabels || '—'} />
        <SummaryRow label="Delivery" value={tierLabel} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant="caption" color={tokens.color.inkTertiary}>
        {label}
      </AppText>
      <AppText variant="bodySm" style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s3,
  },
  summary: {
    gap: tokens.spacing.s2,
    paddingHorizontal: tokens.spacing.s2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.spacing.s4,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
  },
});
