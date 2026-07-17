// End-to-end RSVP through the outbox: offline → queued → synced. Exercises the
// real SyncEngine against in-memory ports (the engine's own testing shape), so the
// schedule's RSVP path is verified the same way acks are.

import { InMemoryKeyValueStore } from '@/data/sync/kvStore';
import { toOptimisticRow } from '@/data/sync/mutations';
import { InMemoryOutboxStore, Outbox } from '@/data/sync/outbox';
import { SyncEngine } from '@/data/sync/syncEngine';
import type {
  LocalStore,
  OutboxRecord,
  PullResponse,
  PushMutation,
  PushResponse,
  SyncTableName,
  SyncTransport,
} from '@/data/sync/types';

class FakeLocalStore implements LocalStore {
  readonly tables = new Map<SyncTableName, Map<string, Record<string, unknown>>>();
  constructor(private readonly profileId = 'me') {}

  private tbl(table: SyncTableName) {
    let m = this.tables.get(table);
    if (!m) {
      m = new Map();
      this.tables.set(table, m);
    }
    return m;
  }
  async getRows(table: SyncTableName) {
    return [...this.tbl(table).values()] as never;
  }
  async applyChanges() {
    /* pull brings nothing in this test */
  }
  async applyOptimistic(record: OutboxRecord) {
    const mapped = toOptimisticRow(record, this.profileId, '2026-07-17T00:00:00.000Z');
    if (mapped) this.tbl(mapped.table).set(mapped.row.id, mapped.row);
  }
}

class FakeTransport implements SyncTransport {
  offline = true;
  pushed: PushMutation[][] = [];
  async push(mutations: PushMutation[]): Promise<PushResponse> {
    if (this.offline) throw new Error('offline');
    this.pushed.push(mutations);
    return {
      results: mutations.map((m) => ({ client_uuid: m.client_uuid, status: 'applied' as const })),
      timestamp: '2026-07-17T01:00:00.000Z',
    };
  }
  async pull(): Promise<PullResponse> {
    if (this.offline) throw new Error('offline');
    return { timestamp: '2026-07-17T01:00:00.000Z', tables: {} };
  }
}

function buildEngine() {
  const transport = new FakeTransport();
  const local = new FakeLocalStore();
  const outbox = new Outbox(new InMemoryOutboxStore());
  const engine = new SyncEngine({
    transport,
    local,
    kv: new InMemoryKeyValueStore(),
    outbox,
    autoSync: false,
    schedule: () => {}, // no background retries in the test
  });
  return { engine, transport, local };
}

describe('RSVP offline → queued → synced', () => {
  it('queues the RSVP offline, reflects it optimistically, then drains on reconnect', async () => {
    const { engine, transport, local } = buildEngine();
    await engine.init();

    // Offline: enqueue an RSVP.
    await engine.enqueue({
      clientUuid: 'rsvp-1',
      type: 'rsvp',
      payload: { event_id: 'evt-1', status: 'yes' },
    });

    // Optimistic row is visible immediately, and the write is queued.
    expect(local.tables.get('rsvps')?.get('rsvp-1')).toMatchObject({
      event_id: 'evt-1',
      status: 'yes',
      profile_id: 'me',
    });
    expect(engine.getStatus().pendingCount).toBe(1);

    // A sync attempt while offline fails softly — the write stays queued.
    await engine.sync('manual');
    expect(engine.getStatus().state).toBe('error');
    expect(engine.getStatus().pendingCount).toBe(1);

    // Reconnect: the queue drains and the pending count clears.
    transport.offline = false;
    await engine.sync('reconnect');

    expect(transport.pushed).toHaveLength(1);
    expect(transport.pushed[0][0]).toMatchObject({ client_uuid: 'rsvp-1', type: 'rsvp' });
    expect(engine.getStatus().pendingCount).toBe(0);
    expect(engine.getStatus().state).toBe('idle');
    expect(engine.getStatus().lastSyncedAt).not.toBeNull();
  });
});
