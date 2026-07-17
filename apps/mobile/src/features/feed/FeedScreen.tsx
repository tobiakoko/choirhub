import { tokens } from '@choirhub/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSyncStatus } from '@/data/sync';
import { useSession } from '@/features/onboarding/api';

import { CategoryFilterChips } from './components/CategoryFilterChips';
import { FeedHeader } from './components/FeedHeader';
import { FeedList } from './components/FeedList';
import type { CategoryFilter } from './feedModel';
import { useAck } from './useAck';
import { useFeed } from './useFeed';
import { useFeedSync } from './useFeedSync';
import { useViewer } from './useViewer';

/**
 * The Home tab: the announcement feed. Renders entirely from WatermelonDB (works
 * offline), boots the sync engine for the session, and threads the viewer's scope
 * through the audience filter and leader roll-up. All the moving parts — live
 * query, ack write, sync status, category filter — are composed here; the pieces
 * below stay presentational.
 */
export function FeedScreen() {
  const { session } = useSession();
  const profileId = session?.user.id;

  useFeedSync(profileId);

  const { resolved } = useViewer();
  const sync = useSyncStatus();
  const acknowledge = useAck();

  const [filter, setFilter] = useState<CategoryFilter>('all');

  const { rows, ackByAnnouncement, completionByAnnouncement } = useFeed({
    profileId: profileId ?? '',
    viewer: resolved?.viewer ?? null,
    isLeader: resolved?.isLeader ?? false,
    filter,
  });

  const header = (
    <View>
      <FeedHeader
        displayName={resolved?.displayName ?? null}
        locationName={resolved?.locationName ?? null}
        voicePart={resolved?.voicePart ?? null}
        lastSyncedAt={sync.lastSyncedAt}
        pendingCount={sync.pendingCount}
        syncing={sync.syncing}
      />
      <CategoryFilterChips selected={filter} onSelect={setFilter} />
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.list}>
        <FeedList
          rows={rows}
          ackByAnnouncement={ackByAnnouncement}
          completionByAnnouncement={completionByAnnouncement}
          onAcknowledge={acknowledge}
          ListHeaderComponent={header}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
  list: {
    flex: 1,
    paddingTop: tokens.spacing.s4,
  },
});
