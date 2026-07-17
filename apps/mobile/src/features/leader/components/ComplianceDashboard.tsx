import { AppText, Card, GhostButton, SectionLabel, tokens } from '@choirhub/ui';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { campaignProgress, isComplete, pendingRows } from '../compliance';
import { useLeaderRole } from '../useLeaderRole';
import { useCampaignCompliance, useLeaderCampaigns } from '../useCompliance';
import { useMarkPaid } from '../useMarkPaid';
import { useRemindPending } from '../useRemindPending';
import { CampaignProgressBar } from './CampaignProgressBar';
import { ComplianceEmptyState } from './ComplianceEmptyState';
import { LocationRollup } from './LocationRollup';
import { PendingMemberRow } from './PendingMemberRow';

/**
 * The compliance dashboard (§5): campaign progress (cyan gradient bar), the pending
 * list with offline-backed "Mark paid" glide-out, a "remind pending only" action,
 * the coordinator's cross-location roll-up, and an isometric reward state once the
 * campaign is settled. Reads are RLS-scoped; every mark is re-checked server-side.
 */
export function ComplianceDashboard() {
  const { capabilities } = useLeaderRole();
  const campaigns = useLeaderCampaigns();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const activeId = selectedId ?? campaigns.data?.[0]?.id;
  const compliance = useCampaignCompliance(activeId);
  const { markPaid } = useMarkPaid();
  const remind = useRemindPending();

  const rows = compliance.data ?? [];
  const progress = campaignProgress(rows);
  const pending = pendingRows(rows);
  const activeCampaign = campaigns.data?.find((c) => c.id === activeId);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {campaigns.isLoading ? (
          <ActivityIndicator color={tokens.color.interactiveBase} />
        ) : campaigns.data && campaigns.data.length === 0 ? (
          <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
            No campaigns yet.
          </AppText>
        ) : (
          <>
            {campaigns.data && campaigns.data.length > 1 ? (
              <View style={styles.campaignChips}>
                {campaigns.data.map((c) => {
                  const selected = c.id === activeId;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedId(c.id)}
                      style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
                    >
                      <AppText
                        variant="bodySm"
                        color={selected ? tokens.color.onColor : tokens.color.inkSecondary}
                      >
                        {c.title}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {activeCampaign ? (
              <AppText variant="heading1">{activeCampaign.title}</AppText>
            ) : null}

            {compliance.isLoading ? (
              <ActivityIndicator color={tokens.color.interactiveBase} />
            ) : rows.length === 0 ? (
              <ComplianceEmptyState variant="empty" />
            ) : isComplete(rows) ? (
              <>
                <Card>
                  <CampaignProgressBar progress={progress} />
                </Card>
                <ComplianceEmptyState variant="complete" />
              </>
            ) : (
              <>
                <Card>
                  <CampaignProgressBar progress={progress} />
                </Card>

                <View style={styles.pendingHeader}>
                  <SectionLabel>{`Pending · ${pending.length}`}</SectionLabel>
                  <GhostButton
                    label="Remind pending only"
                    onPress={() => activeId && remind.mutate(activeId)}
                    disabled={remind.isPending}
                  />
                </View>
                {remind.isSuccess ? (
                  <AppText variant="caption" color={tokens.color.statusSuccess}>
                    {`Reminded ${remind.data} ${remind.data === 1 ? 'member' : 'members'}.`}
                  </AppText>
                ) : null}

                <Card>
                  <View style={styles.pendingList}>
                    {pending.map((member) => (
                      <PendingMemberRow
                        key={member.profileId}
                        member={member}
                        showLocation={capabilities.isCoordinator}
                        onMarkPaid={(profileId) =>
                          activeId && markPaid({ campaignId: activeId, profileId })
                        }
                      />
                    ))}
                  </View>
                </Card>

                {capabilities.isCoordinator ? <LocationRollup rows={rows} /> : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
  content: {
    padding: tokens.spacing.s4,
    gap: tokens.spacing.s4,
  },
  campaignChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.s2,
  },
  chip: {
    minHeight: tokens.size.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.s4,
    borderRadius: tokens.radii.full,
    borderWidth: tokens.borderWidth.hairline,
  },
  chipOn: {
    backgroundColor: tokens.color.interactiveBase,
    borderColor: tokens.color.interactiveBase,
  },
  chipOff: {
    backgroundColor: tokens.color.canvasElevated,
    borderColor: tokens.color.hairline,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  pendingList: {
    gap: tokens.spacing.s3,
  },
});
