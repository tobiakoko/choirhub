// The sync orchestrator. Wires the outbox (push) and delta pull (§6.1) behind a
// single `sync()` that triggers fire on launch / foreground / reconnect / push /
// enqueue. Dependency-injected ports (transport, local store, kv, outbox) keep it
// free of any React Native or WatermelonDB import, so the whole engine is unit
// tested against in-memory fakes.
//
// Order of operations: push first (get local intent to the server), then pull
// (fold in the merged truth). A single in-flight guard coalesces overlapping
// triggers; failures schedule an exponential-backoff retry.

import { Backoff, type BackoffOptions } from './backoff';
import { getLastPulledAt, setLastPulledAt } from './kvStore';
import { reconcile } from './merge';
import { toPushMutation } from './mutations';
import { Outbox, type EnqueueInput } from './outbox';
import { SYNC_TABLES } from '../models/schema';
import type {
  KeyValueStore,
  LocalStore,
  OutboxRecord,
  PullRow,
  SyncReason,
  SyncStatus,
  SyncTransport,
} from './types';

export interface SyncEngineOptions {
  transport: SyncTransport;
  local: LocalStore;
  kv: KeyValueStore;
  outbox: Outbox;
  /** Injectable clock (tests). */
  now?: () => Date;
  /** Injectable retry scheduler; returns a cancel handle. Defaults to setTimeout. */
  schedule?: (fn: () => void, delayMs: number) => void;
  backoff?: BackoffOptions;
  /** Kick a background sync as soon as a write is enqueued (default true). */
  autoSync?: boolean;
}

export class SyncEngine {
  private readonly transport: SyncTransport;
  private readonly local: LocalStore;
  private readonly kv: KeyValueStore;
  private readonly outbox: Outbox;
  private readonly now: () => Date;
  private readonly schedule: (fn: () => void, delayMs: number) => void;
  private readonly backoff: Backoff;
  private readonly autoSync: boolean;

  private running = false;
  /** A trigger that arrives mid-sync sets this so we sync once more after. */
  private queuedAgain = false;
  private retryScheduled = false;
  private status: SyncStatus = { state: 'idle', lastSyncedAt: null, pendingCount: 0 };
  private readonly listeners = new Set<(s: SyncStatus) => void>();

  constructor(opts: SyncEngineOptions) {
    this.transport = opts.transport;
    this.local = opts.local;
    this.kv = opts.kv;
    this.outbox = opts.outbox;
    this.now = opts.now ?? (() => new Date());
    this.schedule =
      opts.schedule ?? ((fn, delayMs) => void setTimeout(fn, delayMs));
    this.backoff = new Backoff(opts.backoff);
    this.autoSync = opts.autoSync ?? true;
  }

  /** Load persisted state and publish the initial pending count. */
  async init(): Promise<void> {
    await this.outbox.load();
    this.status = {
      state: 'idle',
      lastSyncedAt: (await getLastPulledAt(this.kv)) ?? this.status.lastSyncedAt,
      pendingCount: this.outbox.count(),
    };
    this.emit();
  }

  // ── status pub/sub (drives useSyncStatus / OfflinePill) ────────────────────

  getStatus(): SyncStatus {
    return this.status;
  }

  subscribe(listener: (s: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch, pendingCount: this.outbox.count() };
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l(this.status);
  }

  // ── write path ─────────────────────────────────────────────────────────────

  /**
   * Queue a light write, reflect it optimistically, and kick a sync. Returns the
   * stored record (or the existing one on a dedup'd double-tap). Safe offline —
   * the mutation waits in the outbox until the next successful drain.
   */
  async enqueue(input: EnqueueInput): Promise<OutboxRecord> {
    const record = await this.outbox.enqueue(input);
    await this.local.applyOptimistic(record);
    this.setStatus({});
    if (this.autoSync) void this.sync('enqueue');
    return record;
  }

  // ── sync (push then pull) ───────────────────────────────────────────────────

  async sync(reason: SyncReason = 'manual'): Promise<void> {
    if (this.running) {
      // Coalesce: remember that something changed and re-run once we finish.
      this.queuedAgain = true;
      return;
    }
    this.running = true;
    this.setStatus({ state: 'syncing' });

    try {
      await this.drainOutbox();
      await this.pull();

      this.backoff.reset();
      this.retryScheduled = false;
      this.setStatus({ state: 'idle', lastSyncedAt: this.now().toISOString() });
    } catch {
      // Offline is a viewing mode, not an error (§6.1) — surface 'error' state for
      // the pill but never throw to callers; schedule a backoff retry.
      this.setStatus({ state: 'error' });
      this.scheduleRetry();
    } finally {
      this.running = false;
      if (this.queuedAgain) {
        this.queuedAgain = false;
        void this.sync(reason);
      }
    }
  }

  private scheduleRetry(): void {
    if (this.retryScheduled) return;
    this.retryScheduled = true;
    this.schedule(() => {
      this.retryScheduled = false;
      void this.sync('retry');
    }, this.backoff.next());
  }

  /** Push every queued mutation; drop the ones the server confirms. */
  private async drainOutbox(): Promise<void> {
    const pending = this.outbox.all();
    if (pending.length === 0) return;

    const response = await this.transport.push(pending.map(toPushMutation));
    const byUuid = new Map(response.results.map((r) => [r.client_uuid, r]));

    for (const record of pending) {
      const result = byUuid.get(record.clientUuid);
      if (!result) {
        // Server said nothing about this one — keep it, count the attempt.
        await this.outbox.markAttempted(record.clientUuid);
        continue;
      }
      // applied → success; skipped → already-present (idempotent re-send);
      // rejected → RLS denied, never retryable. All three clear the queue.
      await this.outbox.remove(record.clientUuid);
    }
    this.setStatus({});
  }

  /** Fetch the delta since last_pulled_at and reconcile it table by table. */
  private async pull(): Promise<void> {
    const since = await getLastPulledAt(this.kv);
    const response = await this.transport.pull(since);
    const protectedUuids = this.outbox.pendingUuids();

    for (const table of SYNC_TABLES) {
      const incoming = response.tables[table];
      if (!incoming || incoming.length === 0) continue;
      const local = await this.local.getRows(table);
      const { upserts, deletedIds } = reconcile(local, incoming as PullRow[], {
        protectedUuids,
      });
      if (upserts.length > 0 || deletedIds.length > 0) {
        await this.local.applyChanges(table, upserts, deletedIds);
      }
    }

    await setLastPulledAt(this.kv, response.timestamp);
  }
}
