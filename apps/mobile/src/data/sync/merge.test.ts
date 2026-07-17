import { reconcile } from './merge';
import type { PullRow } from './types';

const row = (over: Partial<PullRow> & { id: string; updated_at: string }): PullRow => ({
  deleted_at: null,
  ...over,
});

const noneProtected = { protectedUuids: new Set<string>() };

describe('reconcile', () => {
  it('inserts rows it has never seen', () => {
    const { upserts, deletedIds } = reconcile(
      [],
      [row({ id: '1', updated_at: '2026-07-17T00:00:00Z' })],
      noneProtected
    );
    expect(upserts.map((r) => r.id)).toEqual(['1']);
    expect(deletedIds).toEqual([]);
  });

  it('applies last-write-wins: a newer server row overwrites a stale local one', () => {
    const local = [row({ id: '1', updated_at: '2026-07-17T00:00:00Z', title: 'old' })];
    const incoming = [row({ id: '1', updated_at: '2026-07-17T01:00:00Z', title: 'new' })];
    const { upserts } = reconcile(local, incoming, noneProtected);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].title).toBe('new');
  });

  it('ignores an older/equal server row for a record already current locally', () => {
    const local = [row({ id: '1', updated_at: '2026-07-17T02:00:00Z' })];
    const incoming = [row({ id: '1', updated_at: '2026-07-17T01:00:00Z' })];
    const { upserts, deletedIds } = reconcile(local, incoming, noneProtected);
    expect(upserts).toEqual([]);
    expect(deletedIds).toEqual([]);
  });

  it('tombstones a locally-held row when the server marks it deleted', () => {
    const local = [row({ id: '1', updated_at: '2026-07-17T00:00:00Z' })];
    const incoming = [
      row({ id: '1', updated_at: '2026-07-17T03:00:00Z', deleted_at: '2026-07-17T03:00:00Z' }),
    ];
    const { upserts, deletedIds } = reconcile(local, incoming, noneProtected);
    expect(upserts).toEqual([]);
    expect(deletedIds).toEqual(['1']);
  });

  it('ignores a tombstone for a row it never had', () => {
    const { deletedIds } = reconcile(
      [],
      [row({ id: '9', updated_at: '2026-07-17T03:00:00Z', deleted_at: '2026-07-17T03:00:00Z' })],
      noneProtected
    );
    expect(deletedIds).toEqual([]);
  });

  it('does NOT clobber a queued local write — a protected client_uuid is skipped', () => {
    // Optimistic local ack, still queued in the outbox (client_uuid "X").
    const local = [
      row({ id: 'X', updated_at: '2026-07-17T05:00:00Z', client_uuid: 'X', status: 'yes' }),
    ];
    // A pull that would otherwise delete or downgrade it.
    const incoming = [
      row({
        id: 'server-1',
        updated_at: '2026-07-17T04:00:00Z',
        client_uuid: 'X',
        deleted_at: '2026-07-17T04:00:00Z',
      }),
    ];
    const result = reconcile(local, incoming, { protectedUuids: new Set(['X']) });
    expect(result.upserts).toEqual([]);
    expect(result.deletedIds).toEqual([]); // the local write is untouched
  });

  it('collapses the optimistic placeholder once the write is confirmed (no duplicates)', () => {
    // Same write, now no longer pending: the server echoes it back under its real id.
    const local = [
      row({ id: 'X', updated_at: '2026-07-17T05:00:00Z', client_uuid: 'X', status: 'yes' }),
    ];
    const incoming = [
      row({ id: 'server-1', updated_at: '2026-07-17T06:00:00Z', client_uuid: 'X', status: 'yes' }),
    ];
    const { upserts, deletedIds } = reconcile(local, incoming, noneProtected);
    expect(upserts.map((r) => r.id)).toEqual(['server-1']);
    expect(deletedIds).toEqual(['X']); // placeholder removed
  });
});
