// The write queue. Holds light mutations (acks, RSVPs, form responses, mark-paid)
// with client-generated UUIDs until the push side confirms them (§6.1). Two
// invariants the tests pin down:
//   • FIFO — drained in enqueue order (`seq`).
//   • idempotent — enqueuing the same client UUID twice keeps one row, so a
//     double-tap or a replayed intent never double-sends.
// Persistence is delegated to an OutboxStore port so the queue survives restart
// (production: a WatermelonDB table; tests: in-memory).

import type { MutationPayload, MutationType, OutboxRecord, OutboxStore } from './types';

export interface EnqueueInput {
  clientUuid: string;
  type: MutationType;
  payload: MutationPayload;
}

const bySeq = (a: OutboxRecord, b: OutboxRecord): number => a.seq - b.seq;

export class Outbox {
  private records: OutboxRecord[] = [];
  private loaded = false;

  constructor(
    private readonly store: OutboxStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** Rehydrate from the store. Idempotent — safe to call on every engine init. */
  async load(): Promise<void> {
    this.records = (await this.store.all()).slice().sort(bySeq);
    this.loaded = true;
  }

  private assertLoaded(): void {
    if (!this.loaded) throw new Error('Outbox.load() must be awaited before use');
  }

  count(): number {
    return this.records.length;
  }

  /** Queue in FIFO order; oldest first. */
  all(): OutboxRecord[] {
    return this.records.slice().sort(bySeq);
  }

  /** Client UUIDs of every pending write — the set the pull merge must protect. */
  pendingUuids(): Set<string> {
    return new Set(this.records.map((r) => r.clientUuid));
  }

  private nextSeq(): number {
    return this.records.reduce((max, r) => Math.max(max, r.seq), 0) + 1;
  }

  /**
   * Add a mutation. Returns the stored record, or the existing one unchanged when
   * the client UUID is already queued (dedupe on double-send).
   */
  async enqueue(input: EnqueueInput): Promise<OutboxRecord> {
    this.assertLoaded();
    const existing = this.records.find((r) => r.clientUuid === input.clientUuid);
    if (existing) return existing;

    const record: OutboxRecord = {
      clientUuid: input.clientUuid,
      type: input.type,
      payload: input.payload,
      seq: this.nextSeq(),
      attempts: 0,
      createdAt: this.now().toISOString(),
    };
    this.records.push(record);
    await this.store.add(record);
    return record;
  }

  /** Bump the attempt counter after a failed drain (feeds backoff/telemetry). */
  async markAttempted(clientUuid: string): Promise<void> {
    const record = this.records.find((r) => r.clientUuid === clientUuid);
    if (!record) return;
    record.attempts += 1;
    await this.store.update(record);
  }

  /** Drop a confirmed (applied/skipped/rejected) mutation. Idempotent. */
  async remove(clientUuid: string): Promise<void> {
    const before = this.records.length;
    this.records = this.records.filter((r) => r.clientUuid !== clientUuid);
    if (this.records.length !== before) await this.store.remove(clientUuid);
  }
}

// ── in-memory store (tests + as a reference impl) ────────────────────────────

/**
 * OutboxStore backed by a plain array. Passing a shared `backing` array lets a
 * test simulate an app restart: build a fresh Outbox over the same array and the
 * queue reappears — exactly what the WatermelonDB-backed store does on relaunch.
 */
export class InMemoryOutboxStore implements OutboxStore {
  constructor(private readonly backing: OutboxRecord[] = []) {}

  async all(): Promise<OutboxRecord[]> {
    return this.backing.map((r) => ({ ...r }));
  }

  async add(record: OutboxRecord): Promise<void> {
    this.backing.push({ ...record });
  }

  async update(record: OutboxRecord): Promise<void> {
    const i = this.backing.findIndex((r) => r.clientUuid === record.clientUuid);
    if (i >= 0) this.backing[i] = { ...record };
  }

  async remove(clientUuid: string): Promise<void> {
    const i = this.backing.findIndex((r) => r.clientUuid === clientUuid);
    if (i >= 0) this.backing.splice(i, 1);
  }
}
