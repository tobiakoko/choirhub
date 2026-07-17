import { AppText, tokens } from '@choirhub/ui';
import { useCallback } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import type { AgendaRow } from '../agenda';
import type { RsvpStatus, RsvpView } from '../rsvpState';
import { EventCard } from './EventCard';
import { MonthSectionHeader } from './MonthSectionHeader';

export type ScheduleListProps = {
  rows: AgendaRow[];
  rsvpByEvent: ReadonlyMap<string, RsvpView>;
  onRsvp: (eventId: string, status: RsvpStatus) => void;
  timeZone: string;
  ListHeaderComponent: React.ReactElement;
};

const NO_RSVP: RsvpView = { status: null, pending: false };

/**
 * The agenda list — a single FlatList over the flattened [month header | event]
 * array. Deliberately finite (the agenda model bounds the window), so there is no
 * infinite scroll. Cards are memoized for smooth scrolling on the low-end floor.
 */
export function ScheduleList({
  rows,
  rsvpByEvent,
  onRsvp,
  timeZone,
  ListHeaderComponent,
}: ScheduleListProps) {
  const renderItem = useCallback<ListRenderItem<AgendaRow>>(
    ({ item }) => {
      if (item.type === 'month') {
        return <MonthSectionHeader label={item.label} />;
      }
      return (
        <EventCard
          occurrence={item.occurrence}
          rsvp={rsvpByEvent.get(item.occurrence.event.id) ?? NO_RSVP}
          onRsvp={onRsvp}
          timeZone={timeZone}
        />
      );
    },
    [rsvpByEvent, onRsvp, timeZone]
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ScheduleEmpty}
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

function ScheduleEmpty() {
  return (
    <View style={styles.empty}>
      <AppText variant="heading2" color={tokens.color.inkSecondary}>
        No rehearsals scheduled
      </AppText>
      <AppText variant="bodyMd" color={tokens.color.inkTertiary} style={styles.emptyBody}>
        Upcoming rehearsals and events will appear here — even offline.
      </AppText>
    </View>
  );
}

const keyExtractor = (row: AgendaRow): string => row.key;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.spacing.s4,
    paddingBottom: tokens.spacing.s12,
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
