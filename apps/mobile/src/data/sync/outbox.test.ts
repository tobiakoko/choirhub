import { InMemoryOutboxStore, Outbox } from './outbox';
import type { OutboxRecord } from './types';

const ack = (uuid: string, announcementId: string) =>
  ({
    clientUuid: uuid,
    type: 'ack' as const,
    payload: { announcement_id: announcementId, acknowledged_at: '2026-07-17T00:00:00.000Z' },
  });

describe('Outbox', () => {
  it('requires load() before use', async () => {
    const outbox = new Outbox(new InMemoryOutboxStore());
    await expect(outbox.enqueue(ack('a', 'ann-1'))).rejects.toThrow(/load\(\)/);
  });

  it('survives a restart — a fresh Outbox over the same store rehydrates the queue', async () => {
    // The shared array stands in for on-device SQLite: it outlives the Outbox
    // instance, exactly as the WatermelonDB table outlives an app process.
    const disk: OutboxRecord[] = [];
    const store = new InMemoryOutboxStore(disk);

    const before = new Outbox(store);
    await before.load();
    await before.enqueue(ack('a', 'ann-1'));
    await before.enqueue({
      clientUuid: 'b',
      type: 'rsvp',
      payload: { event_id: 'evt-1', status: 'yes' },
    });
    expect(before.count()).toBe(2);

    // Simulate relaunch: brand-new engine/outbox, same persisted disk.
    const after = new Outbox(store);
    await after.load();
    expect(after.count()).toBe(2);
    expect(after.all().map((r) => r.clientUuid)).toEqual(['a', 'b']);
  });

  it('drains in FIFO enqueue order regardless of insertion timing', async () => {
    const outbox = new Outbox(new InMemoryOutboxStore());
    await outbox.load();
    await outbox.enqueue(ack('first', 'ann-1'));
    await outbox.enqueue(ack('second', 'ann-2'));
    await outbox.enqueue(ack('third', 'ann-3'));

    expect(outbox.all().map((r) => r.clientUuid)).toEqual(['first', 'second', 'third']);
    // seq is monotonic so ordering is stable even after reload.
    expect(outbox.all().map((r) => r.seq)).toEqual([1, 2, 3]);
  });

  it('dedupes by client UUID on double-send — a repeated enqueue keeps one row', async () => {
    const outbox = new Outbox(new InMemoryOutboxStore());
    await outbox.load();
    const first = await outbox.enqueue(ack('dupe', 'ann-1'));
    const second = await outbox.enqueue(ack('dupe', 'ann-1'));

    expect(outbox.count()).toBe(1);
    expect(second).toBe(first); // same stored record, not a new one
    expect(outbox.pendingUuids()).toEqual(new Set(['dupe']));
  });

  it('persists the dedupe across restart (no duplicate row lands on disk)', async () => {
    const disk: OutboxRecord[] = [];
    const store = new InMemoryOutboxStore(disk);
    const outbox = new Outbox(store);
    await outbox.load();
    await outbox.enqueue(ack('dupe', 'ann-1'));
    await outbox.enqueue(ack('dupe', 'ann-1'));

    expect(disk).toHaveLength(1);
    const reloaded = new Outbox(store);
    await reloaded.load();
    expect(reloaded.count()).toBe(1);
  });

  it('removes a confirmed mutation and leaves the rest ordered', async () => {
    const outbox = new Outbox(new InMemoryOutboxStore());
    await outbox.load();
    await outbox.enqueue(ack('a', 'ann-1'));
    await outbox.enqueue(ack('b', 'ann-2'));
    await outbox.enqueue(ack('c', 'ann-3'));

    await outbox.remove('b');
    expect(outbox.all().map((r) => r.clientUuid)).toEqual(['a', 'c']);
  });
});
