import { FAB, tokens } from '@choirhub/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLeaderRole } from '../useLeaderRole';
import { ComposeSheet } from './ComposeSheet';

/**
 * The compose FAB — role-gated (§5): it renders only for a viewer whose roles
 * include a content-authoring role (committee lead / location leader / coordinator).
 * A plain member never sees it, and even if a patched client forced it open, the
 * announcements INSERT policy would reject the write. Anchored bottom-right; tapping
 * it opens the compose sheet.
 */
export function LeaderFab() {
  const { capabilities } = useLeaderRole();
  const [composing, setComposing] = useState(false);

  if (!capabilities.canCompose) return null;

  return (
    <View pointerEvents="box-none" style={styles.anchor}>
      <FAB accessibilityLabel="Compose announcement" onPress={() => setComposing(true)} />
      <ComposeSheet visible={composing} onClose={() => setComposing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: tokens.spacing.s4,
    bottom: tokens.spacing.s6,
  },
});
