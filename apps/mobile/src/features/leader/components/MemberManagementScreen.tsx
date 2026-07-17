import { GradientButton, tokens } from '@choirhub/ui';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useViewer } from '@/features/feed/useViewer';

import { InviteCodeSheet } from './InviteCodeSheet';
import { MemberApprovalList } from './MemberApprovalList';

/**
 * Member management (§5): approve/decline pending joins and mint invite codes for
 * the leader's own location. A coordinator manages via their primary location
 * here; per-location management across a region is a later refinement.
 */
export function MemberManagementScreen() {
  const { resolved } = useViewer();
  const locationId = resolved?.viewer.locationId ?? undefined;
  const [inviting, setInviting] = useState(false);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <MemberApprovalList locationId={locationId} />
        <View>
          <GradientButton
            label="Invite members"
            onPress={() => setInviting(true)}
            disabled={!locationId}
          />
        </View>
      </ScrollView>
      <InviteCodeSheet
        visible={inviting}
        onClose={() => setInviting(false)}
        locationId={locationId}
      />
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
    gap: tokens.spacing.s6,
  },
});
