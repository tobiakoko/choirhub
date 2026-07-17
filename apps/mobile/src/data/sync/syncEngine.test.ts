import { InMemoryKeyValueStore } from './kvStore';
import { toOptimisticRow } from './mutations';
import { InMemoryOutboxStore, Outbox } from './outbox';
import { SyncEngine } from './syncEngine';
import type {
  LocalStore,
  OutboxRecord,
  PullResponse,
  PushMutation,
  PushResponse,
  PullRow,
  SyncTableName,
  SyncTransport,
} from './types';

// ── in-memory ports ──────────────────────────────────────────────────────────

/** LocalStore fake: a Map per table. applyOptimistic reuses the real mapper so it
 *  writes exactly the rows the production store would. */
class FakeLocalStore implements LocalStore {
  readonly tables = new Map<SyncTableName, Map<string, PullRow>>();
  constructor(private readonly profileId = 'me') {}

  private tbl(table: SyncTableName): Map<string, PullRow> {
    let m = this.tables.get(table);
    if (!m) {
      m = new Map();
      this.tables.set(table, m);
    }
    return m;
  }

  rows(table: SyncTableName): PullRow[] {
    return [...this.tbl(table).values()];
  }

  async getRows(table: SyncTableName): Promise<PullRow[]> {
    return this.rows(table).map((r) => ({ ...r }));
  }

  async applyChanges(
    table: SyncTableName,
    upserts: PullRow[],
    deletedIds: string[]
  ): Promise<void> {
    const m = this.tbl(table);
    upserts.forEach((r) => m.set(r.id, { ...r }));
    deletedIds.forEach((id) => m.delete(id));
  }

  async applyOptimistic(record: OutboxRecord): Promise<void> {
    const mapped = toOptimisticRow(record, this.profileId, '2026-07-17T05:00:00.000Z');
    if (mapped) this.tbl(mapped.table).set(mapped.row.id, mapped.row);
  }
}

/** Transport fake with scriptable push/pull and an offline switch. */
class FakeTransport implements SyncTransport {
  pushCalls: PushMutation[][] = [];
  pullSince: (string | null)[] = [];
  offline = false;
  pushHandler: (m: PushMutation[]) => PushResponse = (m) => ({
    results: m.map((x) => ({ client_uuid: x.client_uuid, status: 'applied' as const })),
    timestamp: '2026-07-17T06:00:00.000Z',
  });
  pullQueue: PullResponse[] = [];

  async push(mutations: PushMutation[]): Promise<PushResponse> {
    this.pushCalls.push(mutations);
    if (this.offline) throw new Error('network request failed');
    return this.pushHandler(mutations);
  }

  async pull(lastPulledAt: string | null): Promise<PullResponse> {
    this.pullSince.push(lastPulledAt);
    if (this.offline) throw new Error('network request failed');
    return this.pullQueue.shift() ?? { timestamp: '2026-07-17T06:00:00.000Z', tables: {} };
  }
}

// ── harness ──────────────────────────────────────────────────────────────────

function makeEngine(
  transport: FakeTransport,
  local: FakeLocalStore,
  captureRetry: (fn: () => void, delayMs: number) => void = () => {}
) {
  const outbox = new Outbox(new InMemoryOutboxStore());
  const engine = new SyncEngine({
    transport,
    local,
    kv: new InMemoryKeyValueStore(),
    outbox,
    autoSync: false, // enqueue only queues; tests drive sync() explicitly
    schedule: captureRetry,
    now: () => new Date('2026-07-17T06:00:00.000Z'),
  });
  return { engine, outbox };
}

const ack = (uuid: string, announcementId: string) => ({
  clientUuid: uuid,
  type: 'ack' as const,
  payload: { announcement_id: announcementId, acknowledged_at: '2026-07-17T05:00:00.000Z' },
});

describe('SyncEngine', () => {
  it('drains queued mutations to the server in FIFO order, in one push', async () => {
    const transport = new FakeTransport();
    const local = new FakeLocalStore();
    const { engine } = makeEngine(transport, local);
    await engine.init();

    await engine.enqueue(ack('a', 'ann-1'));
    await engine.enqueue({ clientUuid: 'b', type: 'rsvp', payload: { event_id: 'e1', status: 'yes' } });
    await engine.enqueue(ack('c', 'ann-3'));

    await engine.sync('manual');

    expect(transport.pushCalls).toHaveLength(1);
    expect(transport.pushCalls[0].map((m) => m.client_uuid)).toEqual(['a', 'b', 'c']);
    expect(engine.getStatus().pendingCount).toBe(0);
  });

  it('dedupes by client UUID: a double-enqueue sends the mutation once', async () => {
    const transport = new FakeTransport();
    const { engine } = makeEngine(transport, new FakeLocalStore());
    await engine.init();

    await engine.enqueue(ack('dupe', 'ann-1'));
    await engine.enqueue(ack('dupe', 'ann-1'));
    expect(engine.getStatus().pendingCount).toBe(1);

    await engine.sync('manual');
    expect(transport.pushCalls[0].map((m) => m.client_uuid)).toEqual(['dupe']);
  });

  it('re-sends the same client UUID after a dropped response (idempotent key is stable)', async () => {
    const transport = new FakeTransport();
    const { engine } = makeEngine(transport, new FakeLocalStore());
    await engine.init();
    await engine.enqueue(ack('x', 'ann-1'));

    // First push: server applied it but the response never arrived (empty results).
    transport.pushHandler = () => ({ results: [], timestamp: '2026-07-17T06:00:00.000Z' });
    await engine.sync('manual');
    expect(engine.getStatus().pendingCount).toBe(1); // kept — not confirmed

    // Second push: same UUID goes out again; now it's confirmed and cleared.
    transport.pushHandler = (m) => ({
      results: m.map((x) => ({ client_uuid: x.client_uuid, status: 'applied' as const })),
      timestamp: '2026-07-17T06:00:00.000Z',
    });
    await engine.sync('manual');

    expect(transport.pushCalls.map((c) => c.map((m) => m.client_uuid))).toEqual([['x'], ['x']]);
    expect(engine.getStatus().pendingCount).toBe(0);
  });

  it('a pull does not clobber a still-queued local write', async () => {
    const transport = new FakeTransport();
    const local = new FakeLocalStore();
    const { engine } = makeEngine(transport, local);
    await engine.init();

    // Queue an ack; it's reflected optimistically under id = client_uuid.
    await engine.enqueue(ack('X', 'ann-1'));
    expect(local.rows('acknowledgments').map((r) => r.id)).toEqual(['X']);

    // Push returns nothing about X (still unconfirmed), so it stays queued; then the
    // pull delivers a tombstone for that very write. Protection must keep it.
    transport.pushHandler = () => ({ results: [], timestamp: '2026-07-17T06:00:00.000Z' });
    transport.pullQueue = [
      {
        timestamp: '2026-07-17T06:00:00.000Z',
        tables: {
          acknowledgments: [
            {
              id: 'server-1',
              client_uuid: 'X',
              announcement_id: 'ann-1',
              profile_id: 'me',
              acknowledged_at: '2026-07-17T04:00:00.000Z',
              updated_at: '2026-07-17T04:00:00.000Z',
              deleted_at: '2026-07-17T04:00:00.000Z',
            },
          ],
        },
      },
    ];

    await engine.sync('manual');

    // The optimistic ack survives the pull; still exactly one, still queued.
    const acks = local.rows('acknowledgments');
    expect(acks.map((r) => r.id)).toEqual(['X']);
    expect(acks[0].deleted_at).toBeNull();
    expect(engine.getStatus().pendingCount).toBe(1);
  });

  it('once confirmed, the next pull collapses the placeholder into the server row', async () => {
    const transport = new FakeTransport();
    const local = new FakeLocalStore();
    const { engine } = makeEngine(transport, local);
    await engine.init();
    await engine.enqueue(ack('X', 'ann-1'));

    // Push confirms X (removed from outbox); the same-cycle pull brings the server
    // row (same client_uuid, real id) — placeholder collapses, no duplicate.
    transport.pullQueue = [
      {
        timestamp: '2026-07-17T06:00:00.000Z',
        tables: {
          acknowledgments: [
            {
              id: 'server-1',
              client_uuid: 'X',
              announcement_id: 'ann-1',
              profile_id: 'me',
              acknowledged_at: '2026-07-17T05:00:00.000Z',
              updated_at: '2026-07-17T07:00:00.000Z',
              deleted_at: null,
            },
          ],
        },
      },
    ];

    await engine.sync('manual');

    expect(local.rows('acknowledgments').map((r) => r.id)).toEqual(['server-1']);
    expect(engine.getStatus().pendingCount).toBe(0);
  });

  it('advances the pull cursor only on success and keeps writes on failure', async () => {
    const transport = new FakeTransport();
    const kv = new InMemoryKeyValueStore();
    const outbox = new Outbox(new InMemoryOutboxStore());
    const engine = new SyncEngine({
      transport,
      local: new FakeLocalStore(),
      kv,
      outbox,
      autoSync: false,
      schedule: () => {}, // swallow the backoff retry so no timer fires in the test
      now: () => new Date('2026-07-17T06:00:00.000Z'),
    });
    await engine.init();
    await engine.enqueue(ack('x', 'ann-1'));

    transport.offline = true;
    await engine.sync('manual');
    expect(engine.getStatus().state).toBe('error');
    expect(engine.getStatus().pendingCount).toBe(1); // nothing lost while offline
    expect(await kv.get('sync.last_pulled_at')).toBeUndefined();

    transport.offline = false;
    await engine.sync('reconnect');
    expect(engine.getStatus().state).toBe('idle');
    expect(engine.getStatus().pendingCount).toBe(0);
    expect(await kv.get('sync.last_pulled_at')).toBe('2026-07-17T06:00:00.000Z');
  });

  it('schedules an exponential-backoff retry after a failed sync', async () => {
    const transport = new FakeTransport();
    transport.offline = true;
    const delays: number[] = [];
    const { engine } = makeEngine(transport, new FakeLocalStore(), (_, delayMs) =>
      delays.push(delayMs)
    );
    await engine.init();

    await engine.sync('manual');
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBeGreaterThan(0);
  });
});
