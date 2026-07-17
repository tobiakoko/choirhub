import { buildDigest, type DigestItem } from './digest';

const item = (n: number): DigestItem => ({
  id: `a${n}`,
  title: `Update ${n}`,
  category: 'logistics',
});

describe('buildDigest', () => {
  it('returns null for an empty batch (an empty digest is never sent)', () => {
    expect(buildDigest([])).toBeNull();
  });

  it('summarises a single pending post', () => {
    expect(buildDigest([item(1)])).toEqual({
      title: '1 new update',
      body: 'Update 1',
      count: 1,
      data: { type: 'digest' },
    });
  });

  it('joins up to three titles inline', () => {
    const msg = buildDigest([item(1), item(2), item(3)]);
    expect(msg).toEqual({
      title: '3 new updates',
      body: 'Update 1 · Update 2 · Update 3',
      count: 3,
      data: { type: 'digest' },
    });
  });

  it('collapses the remainder into "+N more" beyond the preview limit', () => {
    const msg = buildDigest([item(1), item(2), item(3), item(4), item(5)]);
    expect(msg?.count).toBe(5);
    expect(msg?.title).toBe('5 new updates');
    expect(msg?.body).toBe('Update 1 · Update 2 · Update 3 +2 more');
  });
});
