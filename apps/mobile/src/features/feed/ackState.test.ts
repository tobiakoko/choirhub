import { deriveAckState, deriveCompletion } from './ackState';
import type { AckRow } from './ackState';

const ack = (id: string, announcementId: string, profileId: string): AckRow => ({
  id,
  announcementId,
  profileId,
});

describe('deriveAckState', () => {
  it('is `none` when the viewer has no ack row', () => {
    expect(deriveAckState('ann-1', 'me', [], new Set())).toBe('none');
  });

  it('is `pending` while the optimistic uuid is still queued in the outbox (🕓)', () => {
    const acks = [ack('uuid-1', 'ann-1', 'me')];
    expect(deriveAckState('ann-1', 'me', acks, new Set(['uuid-1']))).toBe('pending');
  });

  it('is `done` once the ack is confirmed and no longer pending (✓)', () => {
    const acks = [ack('server-id', 'ann-1', 'me')];
    expect(deriveAckState('ann-1', 'me', acks, new Set())).toBe('done');
  });

  it('ignores other members’ acks when resolving the viewer’s state', () => {
    const acks = [ack('x', 'ann-1', 'someone-else')];
    expect(deriveAckState('ann-1', 'me', acks, new Set())).toBe('none');
  });

  it('scopes to the given announcement', () => {
    const acks = [ack('uuid-2', 'ann-2', 'me')];
    expect(deriveAckState('ann-1', 'me', acks, new Set(['uuid-2']))).toBe('none');
  });
});

describe('deriveCompletion', () => {
  const acks = [
    ack('a1', 'ann-1', 'm1'),
    ack('a2', 'ann-1', 'm2'),
    ack('a3', 'ann-2', 'm3'),
  ];

  it('counts acknowledgments for the announcement', () => {
    expect(deriveCompletion('ann-1', acks).acknowledged).toBe(2);
    expect(deriveCompletion('ann-2', acks).acknowledged).toBe(1);
  });

  it('dedupes a member counted twice (optimistic row + confirmed row)', () => {
    const dupes = [ack('uuid', 'ann-1', 'm1'), ack('server-id', 'ann-1', 'm1')];
    expect(deriveCompletion('ann-1', dupes).acknowledged).toBe(1);
  });

  it('computes a ratio when the audience total is known', () => {
    const c = deriveCompletion('ann-1', acks, 4);
    expect(c.total).toBe(4);
    expect(c.ratio).toBeCloseTo(0.5);
  });

  it('omits the ratio when total is unknown or non-positive', () => {
    expect(deriveCompletion('ann-1', acks).ratio).toBeUndefined();
    expect(deriveCompletion('ann-1', acks, 0).ratio).toBeUndefined();
  });

  it('clamps the ratio at 1 when more acks than the recorded total arrive', () => {
    expect(deriveCompletion('ann-1', acks, 1).ratio).toBe(1);
  });
});
