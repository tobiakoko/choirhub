import { AppText, color, spacing } from '@choirhub/ui';
import { FlatList, StyleSheet, View } from 'react-native';

import { RepertoireCard } from './RepertoireCard';
import type { RepertoireSong } from '../songsModel';

export type RepertoireListProps = {
  songs: RepertoireSong[];
  ListHeaderComponent?: React.ComponentProps<typeof FlatList>['ListHeaderComponent'];
};

/**
 * Virtualized repertoire list (performance budget §7: FlatList, memoized cards).
 * Each row is a self-contained RepertoireCard with its own player + sheet state.
 */
export function RepertoireList({ songs, ListHeaderComponent }: RepertoireListProps) {
  return (
    <FlatList
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={({ item }) => <RepertoireCard song={item} />}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <View style={styles.empty}>
          <AppText variant="bodyMd" color={color.inkSecondary}>
            {'No songs in the library yet.'}
          </AppText>
        </View>
      }
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.safeBottom,
  },
  empty: {
    paddingVertical: spacing.s8,
    alignItems: 'center',
  },
});
