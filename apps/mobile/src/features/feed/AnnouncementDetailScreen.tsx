import { AppText, Badge, Card, CriticalText, tokens, type Category } from '@choirhub/ui';
import { Q } from '@nozbe/watermelondb';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { database } from '@/data/database';
import { Announcement, Tables } from '@/data/models';

import { useObservable } from './useObservable';

function titleCase(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

/**
 * Single-announcement detail — the landing screen for a notification deep link
 * (§6.3). Reads from WatermelonDB so it opens offline; shows a graceful empty
 * state when the row hasn't synced to this device yet.
 */
export function AnnouncementDetailScreen({ id }: { id: string }) {
  const rows = useObservable<Announcement[]>(
    () =>
      database
        .get<Announcement>(Tables.announcements)
        .query(Q.where('id', id), Q.where('deleted_at', null))
        .observe(),
    [],
    [id]
  );
  const announcement = rows[0] ?? null;

  if (!announcement) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.empty}>
          <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
            This announcement isn’t available offline yet. It will appear once you’re back online.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const category = announcement.category as Category;
  const isCritical = announcement.priority === 'critical';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card category={isCritical ? 'critical' : category}>
          <View style={styles.badges}>
            <Badge
              tone={isCritical ? 'critical' : 'neutral'}
              label={isCritical ? 'Critical' : titleCase(announcement.category)}
            />
          </View>
          <CriticalText variant="heading1">{announcement.title}</CriticalText>
          <AppText variant="bodyMd" color={tokens.color.inkSecondary} style={styles.body}>
            {announcement.body}
          </AppText>
        </Card>
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
  },
  badges: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.s3,
  },
  body: {
    marginTop: tokens.spacing.s3,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.s6,
  },
});
