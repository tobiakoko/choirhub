import { AppText, SectionLabel, tokens } from '@choirhub/ui';
import { useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import type { AckCompletion, AckState } from '../ackState';
import type { FeedRow } from '../feedModel';
import { AnnouncementCard } from './AnnouncementCard';

export type FeedListProps = {
  rows: FeedRow[];
  ackByAnnouncement: ReadonlyMap<string, AckState>;
  completionByAnnouncement: ReadonlyMap<string, AckCompletion>;
  onAcknowledge: (announcementId: string) => void;
  ListHeaderComponent: React.ReactElement;
};

/**
 * The virtualized feed. One FlatList over a flattened [section header |
 * announcement] array beats nested lists for scroll performance. Cards are
 * memoized and images are thumb-sized, keeping scroll at 60fps on the low-end
 * Android floor (§7). getItemLayout is intentionally omitted — cards are
 * variable-height (title/body wrap, optional completion bar + action), so a fixed
 * row height would misplace items; virtualization is tuned via the batching props
 * below instead.
 */
export function FeedList({
  rows,
  ackByAnnouncement,
  completionByAnnouncement,
  onAcknowledge,
  ListHeaderComponent,
}: FeedListProps) {
  const renderItem = useCallback<ListRenderItem<FeedRow>>(
    ({ item }) => {
      if (item.type === 'section') {
        return (
          <View style={styles.sectionLabel}>
            <SectionLabel>{item.title}</SectionLabel>
          </View>
        );
      }
      return (
        <AnnouncementCard
          announcement={item.announcement}
          ackState={ackByAnnouncement.get(item.announcement.id) ?? 'none'}
          completion={completionByAnnouncement.get(item.announcement.id)}
          onAcknowledge={onAcknowledge}
        />
      );
    },
    [ackByAnnouncement, completionByAnnouncement, onAcknowledge]
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={FeedEmpty}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      updateCellsBatchingPeriod={50}
    />
  );
}

function FeedEmpty() {
  return (
    <View style={styles.empty}>
      <AppText variant="heading2" color={tokens.color.inkSecondary}>
        Nothing here yet
      </AppText>
      <AppText variant="bodyMd" color={tokens.color.inkTertiary} style={styles.emptyBody}>
        Announcements for your choir will show up here — even offline.
      </AppText>
    </View>
  );
}

const keyExtractor = (row: FeedRow): string => row.key;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.spacing.s4,
    paddingBottom: tokens.spacing.s12,
  },
  sectionLabel: {
    paddingTop: tokens.spacing.s6,
    paddingBottom: tokens.spacing.s2,
  },
  empty: {
    alignItems: 'center',
    gap: tokens.spacing.s2,
    paddingTop: tokens.spacing.s12,
  },
  emptyBody: {
    textAlign: 'center',
  },
});
