// WatermelonDB schema — the local mirror of the server tables the client reads
// (system design §6.1 sync protocol). Column sets are text-only: no media blobs
// ever land here; audio/PDF live in the media cache (§6.2). Every synced table
// carries `server_updated_at` + `deleted_at` so delta pull can reconcile with
// last-write-wins, plus the write-side `outbox` that queues light mutations
// (acks, RSVPs, form responses, mark-paid) with client-generated UUIDs.

import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Table names live in one place so the sync engine and models agree.
export const Tables = {
  announcements: 'announcements',
  audiences: 'audiences',
  events: 'events',
  rsvps: 'rsvps',
  songs: 'songs',
  songAssets: 'song_assets',
  forms: 'forms',
  campaignStatus: 'campaign_status',
  acknowledgments: 'acknowledgments',
  outbox: 'outbox',
} as const;

// The nine server tables the pull delta writes into. Kept in sync-order-agnostic
// form; the engine references it to iterate. `outbox` is intentionally excluded —
// it is local-only write state, never a pull target.
export const SYNC_TABLES = [
  Tables.announcements,
  Tables.audiences,
  Tables.events,
  Tables.rsvps,
  Tables.songs,
  Tables.songAssets,
  Tables.forms,
  Tables.campaignStatus,
  Tables.acknowledgments,
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

// Columns shared by every synced record: the server's monotonic change marker and
// its soft-delete tombstone. WatermelonDB manages its own `id`; we store the
// server UUID there so upserts are a plain find-by-id.
const syncColumns = [
  { name: 'server_updated_at', type: 'string' as const, isIndexed: true },
  { name: 'deleted_at', type: 'string' as const, isOptional: true },
];

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: Tables.announcements,
      columns: [
        { name: 'author_id', type: 'string', isIndexed: true },
        { name: 'category', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'pinned', type: 'boolean' },
        { name: 'requires_ack', type: 'boolean' },
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'publish_at', type: 'string' },
        { name: 'expires_at', type: 'string', isOptional: true },
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.audiences,
      columns: [
        { name: 'announcement_id', type: 'string', isIndexed: true },
        { name: 'target_type', type: 'string' },
        { name: 'target_id', type: 'string', isOptional: true },
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.events,
      columns: [
        { name: 'region_id', type: 'string', isIndexed: true },
        { name: 'location_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'author_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'starts_at', type: 'string', isIndexed: true },
        { name: 'ends_at', type: 'string', isOptional: true },
        { name: 'uniform_directive', type: 'string', isOptional: true },
        { name: 'meeting_url', type: 'string', isOptional: true },
        { name: 'recurrence_rule', type: 'string', isOptional: true },
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.rsvps,
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'profile_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'client_uuid', type: 'string', isIndexed: true },
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.songs,
      columns: [
        { name: 'region_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'composer', type: 'string', isOptional: true },
        { name: 'song_key', type: 'string', isOptional: true },
        { name: 'tempo', type: 'number', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON-encoded text[]
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.songAssets,
      columns: [
        { name: 'song_id', type: 'string', isIndexed: true },
        { name: 'asset_type', type: 'string' },
        { name: 'voice_part', type: 'string', isOptional: true },
        { name: 'content', type: 'string', isOptional: true }, // lyrics / solfa text
        { name: 'storage_path', type: 'string', isOptional: true },
        { name: 'renditions', type: 'string' }, // JSON-encoded jsonb of CDN pointers
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.forms,
      columns: [
        { name: 'region_id', type: 'string', isIndexed: true },
        { name: 'location_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'author_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'fields', type: 'string' }, // JSON-encoded jsonb schema
        { name: 'deadline', type: 'string', isOptional: true },
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.campaignStatus,
      columns: [
        { name: 'campaign_id', type: 'string', isIndexed: true },
        { name: 'profile_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'marked_by', type: 'string', isOptional: true },
        { name: 'client_uuid', type: 'string', isOptional: true, isIndexed: true },
        ...syncColumns,
      ],
    }),
    tableSchema({
      name: Tables.acknowledgments,
      columns: [
        { name: 'announcement_id', type: 'string', isIndexed: true },
        { name: 'profile_id', type: 'string', isIndexed: true },
        { name: 'client_uuid', type: 'string', isIndexed: true },
        { name: 'acknowledged_at', type: 'string' },
        ...syncColumns,
      ],
    }),
    // Local-only write queue. One row per pending light mutation; drained FIFO by
    // `seq`, deduped by `client_uuid`. Never a pull target.
    tableSchema({
      name: Tables.outbox,
      columns: [
        { name: 'client_uuid', type: 'string', isIndexed: true },
        { name: 'mutation_type', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON-encoded MutationPayload
        { name: 'seq', type: 'number', isIndexed: true },
        { name: 'attempts', type: 'number' },
        // Not named `created_at`: WatermelonDB reserves that as a managed number column.
        { name: 'enqueued_at', type: 'string' },
      ],
    }),
  ],
});
