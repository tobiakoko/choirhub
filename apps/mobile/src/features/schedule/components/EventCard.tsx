import { AppText, Card, CriticalText, GradientButton, tokens } from '@choirhub/ui';
import { memo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import type { AgendaOccurrence } from '../agenda';
import { formatDayOfMonth, formatTimeRange, formatWeekday } from '../datetime';
import { describeRecurrence } from '../recurrence';
import type { RsvpStatus, RsvpView } from '../rsvpState';
import { AddToCalendarButton } from './AddToCalendarButton';
import { RsvpSegmented } from './RsvpSegmented';

export type EventCardProps = {
  occurrence: AgendaOccurrence;
  rsvp: RsvpView;
  onRsvp: (eventId: string, status: RsvpStatus) => void;
  /** Device timezone, threaded from the screen for consistent formatting. */
  timeZone: string;
};

/**
 * A rehearsal / event on the agenda. A date chip (weekday + day) leads; the time
 * range renders in the device timezone as CriticalText so it never truncates
 * (§2.3). Venue and the uniform directive are always visible, also as CriticalText.
 * The weekly cadence, an optional Join Zoom, the 48px RSVP control, and
 * "Add to phone calendar" all live on the card — no detail tap required.
 */
function EventCardComponent({ occurrence, rsvp, onRsvp, timeZone }: EventCardProps) {
  const { event, startIso, endIso } = occurrence;
  const cadence = describeRecurrence(event.recurrenceRule, startIso, timeZone);

  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.dateChip}>
            <AppText variant="caption" color={tokens.color.interactiveBase}>
              {formatWeekday(startIso, timeZone)}
            </AppText>
            <AppText variant="heading2" color={tokens.color.interactiveBase}>
              {formatDayOfMonth(startIso, timeZone)}
            </AppText>
          </View>
          <View style={styles.headerText}>
            <CriticalText variant="bodyLg" color={tokens.color.inkPrimary}>
              {formatTimeRange(startIso, endIso, timeZone)}
            </CriticalText>
            <AppText variant="heading2">{event.title}</AppText>
            {cadence ? (
              <AppText variant="caption" color={tokens.color.inkSecondary}>
                {`🔁 ${cadence}`}
              </AppText>
            ) : null}
          </View>
        </View>

        {event.description ? (
          <DetailRow label="Where" value={event.description} />
        ) : null}
        {event.uniformDirective ? (
          <DetailRow label="Uniform" value={event.uniformDirective} />
        ) : null}

        {event.meetingUrl ? (
          <GradientButton
            label="Join Zoom"
            variant="secondary"
            accessibilityLabel="Join the Zoom meeting"
            onPress={() => {
              const url = event.meetingUrl;
              if (url) void Linking.openURL(url);
            }}
          />
        ) : null}

        <RsvpSegmented
          value={rsvp.status}
          pending={rsvp.pending}
          onSelect={(status) => onRsvp(event.id, status)}
        />

        <AddToCalendarButton occurrence={occurrence} />
      </View>
    </Card>
  );
}

/** A labeled, never-truncated detail line (venue, uniform). */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" color={tokens.color.inkTertiary}>
        {label}
      </AppText>
      <CriticalText variant="bodyMd" color={tokens.color.inkPrimary}>
        {value}
      </CriticalText>
    </View>
  );
}

/** Re-render only when the occurrence identity or the RSVP view changes. */
function areEqual(prev: EventCardProps, next: EventCardProps): boolean {
  return (
    prev.occurrence.key === next.occurrence.key &&
    prev.occurrence.event.title === next.occurrence.event.title &&
    prev.occurrence.event.description === next.occurrence.event.description &&
    prev.occurrence.event.uniformDirective === next.occurrence.event.uniformDirective &&
    prev.occurrence.event.meetingUrl === next.occurrence.event.meetingUrl &&
    prev.occurrence.endIso === next.occurrence.endIso &&
    prev.rsvp.status === next.rsvp.status &&
    prev.rsvp.pending === next.rsvp.pending &&
    prev.timeZone === next.timeZone &&
    prev.onRsvp === next.onRsvp
  );
}

const styles = StyleSheet.create({
  body: {
    gap: tokens.spacing.s3,
  },
  headerRow: {
    flexDirection: 'row',
    gap: tokens.spacing.s3,
  },
  dateChip: {
    width: tokens.size.avatarMd,
    minHeight: tokens.size.avatarMd,
    borderRadius: tokens.radii.md,
    backgroundColor: tokens.color.interactiveGhost,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.s1,
  },
  headerText: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
  detailRow: {
    gap: tokens.spacing.s1,
  },
});

export const EventCard = memo(EventCardComponent, areEqual);
