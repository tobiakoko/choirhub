import { isEvictable, planEviction } from './lru';
import type { CacheEntry } from './types';

const entry = (over: Partial<CacheEntry> & Pick<CacheEntry, 'id'>): CacheEntry => ({
  assetType: 'part_audio',
  bytes: 1000,
  lastAccessedAt: 0,
  ...over,
});

describe('isEvictable', () => {
  it('protects lyrics and solfa text', () => {
    expect(isEvictable(entry({ id: 'l', assetType: 'lyrics' }))).toBe(false);
    expect(isEvictable(entry({ id: 's', assetType: 'solfa' }))).toBe(false);
    expect(isEvictable(entry({ id: 'a', assetType: 'part_audio' }))).toBe(true);
    expect(isEvictable(entry({ id: 'p', assetType: 'score_pdf' }))).toBe(true);
  });
});

describe('planEviction', () => {
  it('evicts nothing when the incoming file already fits', () => {
    const plan = planEviction({
      entries: [entry({ id: 'a', bytes: 400 })],
      limitBytes: 1000,
      incomingBytes: 400,
    });
    expect(plan).toEqual({ evict: [], freedBytes: 0, fits: true });
  });

  it('evicts least-recently-used audio first, only as much as needed', () => {
    const entries = [
      entry({ id: 'old', bytes: 500, lastAccessedAt: 1 }),
      entry({ id: 'mid', bytes: 500, lastAccessedAt: 5 }),
      entry({ id: 'new', bytes: 500, lastAccessedAt: 9 }),
    ];
    // used 1500, budget 1000, incoming 500 → must free 1000 → drop the two oldest.
    const plan = planEviction({ entries, limitBytes: 1000, incomingBytes: 500 });
    expect(plan.evict).toEqual(['old', 'mid']);
    expect(plan.freedBytes).toBe(1000);
    expect(plan.fits).toBe(true);
  });

  it('never evicts lyrics/solfa even when protected text alone exceeds budget', () => {
    const entries = [
      entry({ id: 'lyrics', assetType: 'lyrics', bytes: 1200, lastAccessedAt: 0 }),
      entry({ id: 'audio', assetType: 'part_audio', bytes: 400, lastAccessedAt: 1 }),
    ];
    // used 1600 > budget 1000. Only the audio is evictable; protected text (1200)
    // by itself keeps us over budget, so eviction can't make it fit.
    const plan = planEviction({ entries, limitBytes: 1000 });
    expect(plan.evict).toEqual(['audio']);
    expect(plan.fits).toBe(false);
  });

  it('reports fits=false but still frees all it can when the incoming file alone exceeds budget', () => {
    const entries = [
      entry({ id: 'a', bytes: 300, lastAccessedAt: 1 }),
      entry({ id: 'b', bytes: 300, lastAccessedAt: 2 }),
    ];
    // Incoming 1100 > budget 1000: even evicting everything can't make it fit.
    const plan = planEviction({ entries, limitBytes: 1000, incomingBytes: 1100 });
    expect(plan.evict).toEqual(['a', 'b']);
    expect(plan.fits).toBe(false);
  });
});
