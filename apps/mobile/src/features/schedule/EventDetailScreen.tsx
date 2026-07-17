import { AppText, Card, CriticalText, tokens } from '@choirhub/ui';
import { Q } from '@nozbe/watermelondb';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { database } from '@/data/database';
import { Event, Tables } from '@/data/models';
import { useObservable } from '@/features/feed/useObservable';

import { formatDayLabel, formatTimeRange } from './datetime';

/**
 * Single-event detail — the landing screen for an event notification deep link
 * (§6.3). Reads from WatermelonDB (offline-first); times and the uniform directive
 * use CriticalText so they never truncate (accessibility floor).
 */
export function EventDetailScreen({ id }: { id: string }) {
  const rows = useObservable<Event[]>(
    () =>
      database
        .get<Event>(Tables.events)
        .query(Q.where('id', id), Q.where('deleted_at', null))
        .observe(),
    [],
    [id]
  );
  const event = rows[0] ?? null;

  if (!event) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.empty}>
          <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
            This event isn’t available offline yet. It will appear once you’re back online.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <CriticalText variant="heading1">{event.title}</CriticalText>
          <CriticalText variant="bodyLg" color={tokens.color.inkSecondary} style={styles.when}>
            {formatDayLabel(event.startsAt)} · {formatTimeRange(event.startsAt, event.endsAt)}
          </CriticalText>
          {event.uniformDirective ? (
            <View style={styles.section}>
              <AppText variant="bodySm" color={tokens.color.inkTertiary}>
                Uniform
              </AppText>
              <CriticalText variant="bodyMd">{event.uniformDirective}</CriticalText>
            </View>
          ) : null}
          {event.description ? (
            <AppText variant="bodyMd" color={tokens.color.inkSecondary} style={styles.section}>
              {event.description}
            </AppText>
          ) : null}
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
  when: {
    marginTop: tokens.spacing.s2,
  },
  section: {
    marginTop: tokens.spacing.s4,
    gap: tokens.spacing.s1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.s6,
  },
});
