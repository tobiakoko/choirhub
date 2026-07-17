import {
  AppText,
  Avatar,
  Card,
  GhostButton,
  GradientButton,
  SectionLabel,
  VocalPartBadge,
  tokens,
  useGlideOut,
} from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  useApproveMember,
  useDeclineMember,
  usePendingMembers,
} from '../useMemberApproval';

export type MemberApprovalListProps = {
  locationId: string | undefined;
};

/**
 * Pending-join approvals (§5 — approve joins: location leader / coordinator). Each
 * pending member can be approved (grants the scoped member role) or declined (kept
 * as an audit trail). Authority is re-proven server-side by the approve/decline
 * RPCs, so a member persona reaching this list still cannot approve anyone.
 */
export function MemberApprovalList({ locationId }: MemberApprovalListProps) {
  const pending = usePendingMembers(locationId);
  const approve = useApproveMember(locationId);
  const decline = useDeclineMember(locationId);
  const glide = useGlideOut();

  const members = pending.data ?? [];

  return (
    <View style={styles.container}>
      <SectionLabel>{`Pending approval · ${members.length}`}</SectionLabel>
      {members.length === 0 ? (
        <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
          No one is waiting to be approved.
        </AppText>
      ) : (
        members.map((member) => (
          <Animated.View key={member.id} entering={glide.entering} exiting={glide.exiting}>
            <Card>
              <View style={styles.row}>
                <Avatar name={member.displayName} size="sm" />
                <View style={styles.text}>
                  <AppText variant="bodyMd" numberOfLines={1}>
                    {member.displayName}
                  </AppText>
                  {member.voicePart ? <VocalPartBadge part={member.voicePart} /> : null}
                </View>
              </View>
              <View style={styles.actions}>
                <GhostButton
                  label="Decline"
                  accessibilityLabel={`Decline ${member.displayName}`}
                  onPress={() => decline.mutate(member.id)}
                />
                <GradientButton
                  label="Approve"
                  accessibilityLabel={`Approve ${member.displayName}`}
                  onPress={() => approve.mutate(member.id)}
                />
              </View>
            </Card>
          </Animated.View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  text: {
    flex: 1,
    gap: tokens.spacing.s2,
    alignItems: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: tokens.spacing.s3,
    paddingTop: tokens.spacing.s3,
  },
});
