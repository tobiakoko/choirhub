import { AppText, Avatar, Badge, Card, tokens } from '@choirhub/ui';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AckCompletion, AckState } from '../ackState';
import { categoryLabel, deriveAction, stripeCategory, type FeedAnnouncement } from '../feedModel';
import { timeAgo } from '../format';
import { CardActionRow } from './CardActionRow';
import { CompletionBar } from './CompletionBar';

export type AnnouncementCardProps = {
  announcement: FeedAnnouncement;
  ackState: AckState;
  /** Leader roll-up; present only for leaders on ack-required items. */
  completion?: AckCompletion;
  onAcknowledge: (announcementId: string) => void;
};

/**
 * The central unit of communication (design system §7.1). Anatomy, top to bottom:
 * a 4px category stripe on the left edge, a header (avatar · poster name ·
 * timestamp, with a PINNED tag when pinned), the heading-2 title, the body, an
 * optional leader completion bar, and the full-width on-card action. Memoized so
 * the feed scrolls at 60fps — only the fields it renders trigger a re-render.
 */
function AnnouncementCardComponent({
  announcement,
  ackState,
  completion,
  onAcknowledge,
}: AnnouncementCardProps) {
  const action = deriveAction(announcement);
  const posterName = announcement.authorName?.trim() || categoryLabel(announcement.category);

  return (
    <Card category={stripeCategory(announcement)}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Avatar name={posterName} size="sm" />
          <View style={styles.headerText}>
            <AppText variant="bodySm" numberOfLines={1}>
              {posterName}
            </AppText>
            <AppText variant="caption" color={tokens.color.inkSecondary}>
              {timeAgo(announcement.publishAt)}
            </AppText>
          </View>
          {announcement.pinned ? <Badge label="Pinned" tone="brand" /> : null}
        </View>

        <AppText variant="heading2">{announcement.title}</AppText>
        <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
          {announcement.body}
        </AppText>

        {completion ? <CompletionBar completion={completion} /> : null}

        {action ? (
          <CardActionRow
            action={action}
            ackState={ackState}
            onAcknowledge={() => onAcknowledge(announcement.id)}
          />
        ) : null}
      </View>
    </Card>
  );
}

/** Re-render only when a rendered field, the ack state, or the roll-up changes. */
function areEqual(prev: AnnouncementCardProps, next: AnnouncementCardProps): boolean {
  const a = prev.announcement;
  const b = next.announcement;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.body === b.body &&
    a.category === b.category &&
    a.priority === b.priority &&
    a.pinned === b.pinned &&
    a.requiresAck === b.requiresAck &&
    a.publishAt === b.publishAt &&
    a.authorName === b.authorName &&
    prev.ackState === next.ackState &&
    prev.completion?.acknowledged === next.completion?.acknowledged &&
    prev.completion?.total === next.completion?.total &&
    prev.onAcknowledge === next.onAcknowledge
  );
}

const styles = StyleSheet.create({
  body: {
    gap: tokens.spacing.s3,
    // Clear the 4px category stripe on the left edge.
    paddingLeft: tokens.spacing.s2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  headerText: {
    flex: 1,
  },
});

export const AnnouncementCard = memo(AnnouncementCardComponent, areEqual);
