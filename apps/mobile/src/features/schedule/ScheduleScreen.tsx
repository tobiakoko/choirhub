import { AppText, tokens } from '@choirhub/ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/features/onboarding/api';

import { ScheduleList } from './components/ScheduleList';
import { deviceTimeZone } from './datetime';
import { useRsvp } from './useRsvp';
import { useSchedule } from './useSchedule';

/**
 * The Schedule tab: a month-grouped agenda of upcoming rehearsals and events.
 * Renders from WatermelonDB (offline-ready); times show in the device timezone,
 * RSVPs go through the outbox, and each card can be added to the phone calendar.
 */
export function ScheduleScreen() {
  const { session } = useSession();
  const profileId = session?.user.id;

  const timeZone = deviceTimeZone();
  const { rows, rsvpByEvent } = useSchedule({ profileId: profileId ?? '', timeZone });
  const rsvp = useRsvp();

  const header = (
    <View style={styles.header}>
      <AppText variant="heading1">Schedule</AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.list}>
        <ScheduleList
          rows={rows}
          rsvpByEvent={rsvpByEvent}
          onRsvp={rsvp}
          timeZone={timeZone}
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
  header: {
    paddingBottom: tokens.spacing.s2,
  },
});
