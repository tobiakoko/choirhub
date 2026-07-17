// The live feed query. Observes the four local tables the feed reads —
// announcements, audiences, acknowledgments, and the outbox — and folds them
// through the pure feed model so the FlatList always reflects the current
// WatermelonDB state (observe → auto-update, CLAUDE.md rule 3). No network here:
// the sync engine writes deltas + optimistic rows into these tables; we just react.

import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';

import { database } from '@/data/database';
import {
  Acknowledgment,
  Announcement,
  Audience,
  OutboxEntry,
  Tables,
} from '@/data/models';

import type { AckCompletion, AckRow, AckState } from './ackState';
import { deriveAckState, deriveCompletion } from './ackState';
import type { CategoryFilter, FeedAnnouncement, FeedRow } from './feedModel';
import { buildFeedRows } from './feedModel';
import { useObservable } from './useObservable';
import type { AudienceRow, Viewer } from './viewer';
import { filterVisible, groupAudiences } from './viewer';

const notDeleted = () => [Q.where('deleted_at', null)];

export interface UseFeedParams {
  /** Signed-in member id — identifies "my" acknowledgment. */
  profileId: string;
  /** Resolved scope for the presentational audience filter; null = show all. */
  viewer: Viewer | null;
  /** Whether the completion roll-up should be computed (leaders only). */
  isLeader: boolean;
  /** Selected category chip. */
  filter: CategoryFilter;
}

export interface UseFeed {
  rows: FeedRow[];
  ackByAnnouncement: ReadonlyMap<string, AckState>;
  completionByAnnouncement: ReadonlyMap<string, AckCompletion>;
  isEmpty: boolean;
}

export function useFeed({ profileId, viewer, isLeader, filter }: UseFeedParams): UseFeed {
  const announcements = useObservable<Announcement[]>(
    () => database.get<Announcement>(Tables.announcements).query(...notDeleted()).observe(),
    [],
    []
  );
  const audiences = useObservable<Audience[]>(
    () => database.get<Audience>(Tables.audiences).query(...notDeleted()).observe(),
    [],
    []
  );
  const acks = useObservable<Acknowledgment[]>(
    () => database.get<Acknowledgment>(Tables.acknowledgments).query(...notDeleted()).observe(),
    [],
    []
  );
  const outbox = useObservable<OutboxEntry[]>(
    () => database.get<OutboxEntry>(Tables.outbox).query().observe(),
    [],
    []
  );

  // Map WatermelonDB models to the pure model's structural types once per emission.
  const feedAnns = useMemo<FeedAnnouncement[]>(
    () =>
      announcements.map((a) => ({
        id: a.id,
        authorId: a.authorId,
        category: a.category,
        priority: a.priority,
        pinned: a.pinned,
        requiresAck: a.requiresAck,
        title: a.title,
        body: a.body,
        publishAt: a.publishAt,
      })),
    [announcements]
  );

  const audiencesByAnnouncement = useMemo(
    () =>
      groupAudiences(
        audiences.map<AudienceRow>((row) => ({
          announcementId: row.announcementId,
          targetType: row.targetType as AudienceRow['targetType'],
          targetId: row.targetId ?? null,
        }))
      ),
    [audiences]
  );

  const ackRows = useMemo<AckRow[]>(
    () =>
      acks.map((a) => ({ id: a.id, announcementId: a.announcementId, profileId: a.profileId })),
    [acks]
  );

  const pendingAckUuids = useMemo(
    () => new Set(outbox.filter((o) => o.mutationType === 'ack').map((o) => o.clientUuid)),
    [outbox]
  );

  const visible = useMemo(
    () => filterVisible(feedAnns, audiencesByAnnouncement, viewer),
    [feedAnns, audiencesByAnnouncement, viewer]
  );

  const rows = useMemo(() => buildFeedRows(visible, filter), [visible, filter]);

  const ackByAnnouncement = useMemo(() => {
    const map = new Map<string, AckState>();
    for (const a of visible) {
      map.set(a.id, deriveAckState(a.id, profileId, ackRows, pendingAckUuids));
    }
    return map;
  }, [visible, profileId, ackRows, pendingAckUuids]);

  const completionByAnnouncement = useMemo(() => {
    const map = new Map<string, AckCompletion>();
    if (!isLeader) return map;
    for (const a of visible) {
      if (a.requiresAck) map.set(a.id, deriveCompletion(a.id, ackRows));
    }
    return map;
  }, [visible, isLeader, ackRows]);

  return {
    rows,
    ackByAnnouncement,
    completionByAnnouncement,
    isEmpty: rows.length === 0,
  };
}
