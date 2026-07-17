import { AppText, color, spacing } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useViewer } from '@/features/feed/useViewer';

import { RepertoireList } from './components';
import { useSongs } from './useSongs';

/**
 * The Songs tab: the offline repertoire library. Renders entirely from
 * WatermelonDB (works offline) and threads the member's voice part through so
 * their own line is promoted on every card (§7.2). Audio is resolved lazily by the
 * media cache when a member presses play — nothing here blocks on the network.
 */
export function SongsScreen() {
  const { resolved } = useViewer();
  const voicePart = resolved?.voicePart ?? null;
  const { songs } = useSongs({ voicePart });

  const header = (
    <View style={styles.header}>
      <AppText variant="heading1">Song library</AppText>
      <AppText variant="bodySm" color={color.inkSecondary}>
        {voicePart
          ? `Your part: ${voicePart}`
          : 'Lyrics, solfa, and your part audio — offline ready'}
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <RepertoireList songs={songs} ListHeaderComponent={header} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.canvasBase,
  },
  header: {
    paddingTop: spacing.s4,
    paddingBottom: spacing.s3,
    gap: spacing.s1,
  },
});
