// Wire + internal types shared across the sync engine. Kept dependency-free so
// both the React Native app and the Deno edge function agree on the protocol
// shape (system design §6.1).

import type { SyncTableName } from '../models/schema';

export type { SyncTableName };

// ── light-write mutations (the outbox / push side) ───────────────────────────

/** The four light writes that queue offline (§6.1). */
export type MutationType = 'ack' | 'rsvp' | 'form_response' | 'mark_paid';

export type RsvpStatus = 'yes' | 'no' | 'maybe';
export type CampaignState = 'pending' | 'complete' | 'exempt';

export interface AckPayload {
  announcement_id: string;
  acknowledged_at: string;
}
export interface RsvpPayload {
  event_id: string;
  status: RsvpStatus;
}
export interface FormResponsePayload {
  form_id: string;
  response: Record<string, unknown>;
}
export interface MarkPaidPayload {
  campaign_id: string;
  profile_id: string;
  status: CampaignState;
}

export type MutationPayload =
  | AckPayload
  | RsvpPayload
  | FormResponsePayload
  | MarkPaidPayload;

/** A queued mutation as held locally (before push). */
export interface OutboxRecord {
  clientUuid: string;
  type: MutationType;
  payload: MutationPayload;
  /** Monotonic FIFO ordering key; stable across restarts. */
  seq: number;
  /** Push attempts so far — drives backoff / observability. */
  attempts: number;
  /** ISO timestamp the mutation was first enqueued. */
  createdAt: string;
}

/** A mutation as sent to the edge function. `client_uuid` makes push idempotent. */
export interface PushMutation {
  client_uuid: string;
  type: MutationType;
  payload: MutationPayload;
}

export type PushStatus = 'applied' | 'skipped' | 'rejected';

/** Per-mutation outcome. `applied`/`skipped` clear the outbox row; `rejected`
 *  (RLS denied — never retryable) is dropped; a transport error throws instead. */
export interface PushResult {
  client_uuid: string;
  status: PushStatus;
  error?: string;
}

export interface PushResponse {
  results: PushResult[];
  timestamp: string;
}

// ── delta pull (the read side) ───────────────────────────────────────────────

/** A synced row as it comes off the wire. Always carries the sync bookkeeping
 *  columns; the rest are table-specific text columns. */
export interface PullRow {
  id: string;
  updated_at: string;
  deleted_at: string | null;
  [column: string]: unknown;
}

export interface PullResponse {
  /** Server clock at the moment of the query — becomes the next `last_pulled_at`. */
  timestamp: string;
  tables: Partial<Record<SyncTableName, PullRow[]>>;
}

// ── ports (injected; production adapters live alongside, tests fake them) ─────

/** HTTP boundary to the `sync` edge function; the real impl carries the JWT. */
export interface SyncTransport {
  pull(lastPulledAt: string | null): Promise<PullResponse>;
  push(mutations: PushMutation[]): Promise<PushResponse>;
}

/** Local persistence boundary for the pull/merge side. */
export interface LocalStore {
  /** Current rows for a table (used to reconcile against the incoming delta). */
  getRows(table: SyncTableName): Promise<PullRow[]>;
  /** Apply reconciled upserts and tombstone deletes for one table. */
  applyChanges(table: SyncTableName, upserts: PullRow[], deletedIds: string[]): Promise<void>;
  /** Optimistically reflect a queued mutation so the UI updates immediately (§6.1). */
  applyOptimistic(record: OutboxRecord): Promise<void>;
}

/** Small JSON key/value store (last_pulled_at). Matches WatermelonDB's
 *  `database.localStorage` shape so production wiring is a thin wrapper. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Persistence for the outbox queue. Load-all + per-row mutations. */
export interface OutboxStore {
  all(): Promise<OutboxRecord[]>;
  add(record: OutboxRecord): Promise<void>;
  update(record: OutboxRecord): Promise<void>;
  remove(clientUuid: string): Promise<void>;
}

// ── engine status (drives useSyncStatus / OfflinePill) ───────────────────────

export type SyncState = 'idle' | 'syncing' | 'error';

export interface SyncStatus {
  state: SyncState;
  /** ISO timestamp of the last fully successful sync, or null if never. */
  lastSyncedAt: string | null;
  /** Queued light writes not yet confirmed by the server. */
  pendingCount: number;
}

/** Why a sync fired — useful for logs/telemetry and test assertions. */
export type SyncReason = 'launch' | 'foreground' | 'reconnect' | 'push' | 'enqueue' | 'retry' | 'manual';
