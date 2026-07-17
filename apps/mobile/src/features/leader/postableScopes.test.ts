import {
  type PostableScope,
  type PostableScopeRow,
  reachBounds,
  rowToScope,
  scopeKey,
  sortScopes,
} from './postableScopes';

const scope = (over: Partial<PostableScope>): PostableScope => ({
  targetType: 'location',
  targetId: 'loc-1',
  label: 'DC',
  memberCount: 10,
  ...over,
});

describe('rowToScope', () => {
  it('maps the snake_case RPC row to the camelCase scope', () => {
    const row: PostableScopeRow = {
      target_type: 'voice_part',
      target_id: 'g-1',
      label: 'DC Sopranos',
      member_count: 4,
    };
    expect(rowToScope(row)).toEqual({
      targetType: 'voice_part',
      targetId: 'g-1',
      label: 'DC Sopranos',
      memberCount: 4,
    });
  });
});

describe('scopeKey', () => {
  it('keys a scoped target on type + id', () => {
    expect(scopeKey({ targetType: 'location', targetId: 'loc-1' })).toBe('location:loc-1');
  });
  it('keys the region-wide all scope on the type alone', () => {
    expect(scopeKey({ targetType: 'all', targetId: null })).toBe('all:all');
  });
});

describe('sortScopes', () => {
  it('orders broadest-first, then alphabetically within a tier', () => {
    const ordered = sortScopes([
      scope({ targetType: 'voice_part', targetId: 'v', label: 'Tenors' }),
      scope({ targetType: 'location', targetId: 'b', label: 'Dallas' }),
      scope({ targetType: 'all', targetId: null, label: 'Everyone' }),
      scope({ targetType: 'location', targetId: 'a', label: 'Atlanta' }),
      scope({ targetType: 'region', targetId: 'r', label: 'East' }),
    ]);
    expect(ordered.map((s) => s.label)).toEqual([
      'Everyone',
      'East',
      'Atlanta',
      'Dallas',
      'Tenors',
    ]);
  });
});

describe('reachBounds', () => {
  it('is zero for an empty selection', () => {
    expect(reachBounds([])).toEqual({ atLeast: 0, atMost: 0 });
  });

  it('floors at the largest single scope and ceilings at the sum', () => {
    const bounds = reachBounds([
      scope({ memberCount: 30 }),
      scope({ memberCount: 12 }),
      scope({ memberCount: 5 }),
    ]);
    expect(bounds).toEqual({ atLeast: 30, atMost: 47 });
  });
});
