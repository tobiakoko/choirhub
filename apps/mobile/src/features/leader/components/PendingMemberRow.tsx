import { Avatar, GhostButton, AppText, tokens, useGlideOut } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { ComplianceRow } from '../compliance';

export type PendingMemberRowProps = {
  member: ComplianceRow;
  /** Show the member's location — used in the coordinator's cross-location list. */
  showLocation?: boolean;
  onMarkPaid: (profileId: string) => void;
};

/**
 * One pending member with a "Mark paid" action. When marked, the optimistic cache
 * update drops the row from the pending list and it glides out (FadeOutRight,
 * §"compliance row → Paid"), degrading to a fade under Reduce Motion.
 */
export function PendingMemberRow({ member, showLocation, onMarkPaid }: PendingMemberRowProps) {
  const glide = useGlideOut();

  return (
    <Animated.View entering={glide.entering} exiting={glide.exiting} style={styles.row}>
      <Avatar name={member.memberName} size="sm" />
      <View style={styles.text}>
        <AppText variant="bodyMd" numberOfLines={1}>
          {member.memberName}
        </AppText>
        {showLocation && member.locationName ? (
          <AppText variant="caption" color={tokens.color.inkTertiary}>
            {member.locationName}
          </AppText>
        ) : null}
      </View>
      <GhostButton
        label="Mark paid"
        accessibilityLabel={`Mark ${member.memberName} paid`}
        onPress={() => onMarkPaid(member.profileId)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
    minHeight: tokens.size.touchTarget,
  },
  text: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
});
