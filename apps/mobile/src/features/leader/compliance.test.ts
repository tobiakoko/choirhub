import {
  campaignProgress,
  type ComplianceRow,
  isComplete,
  pendingRows,
  rollupByLocation,
} from './compliance';

const rows: ComplianceRow[] = [
  { profileId: 'a', memberName: 'Ada', status: 'complete', locationName: 'DC' },
  { profileId: 'b', memberName: 'Bola', status: 'pending', locationName: 'DC' },
  { profileId: 'c', memberName: 'Chidi', status: 'exempt', locationName: 'Dallas' },
  { profileId: 'd', memberName: 'Dami', status: 'pending', locationName: 'Dallas' },
];

describe('campaignProgress', () => {
  it('counts states and treats complete+exempt as resolved', () => {
    const p = campaignProgress(rows);
    expect(p).toEqual({
      complete: 1,
      exempt: 1,
      pending: 2,
      total: 4,
      resolved: 2,
      ratio: 0.5,
    });
  });

  it('is zero-ratio for an empty campaign (no divide-by-zero)', () => {
    const p = campaignProgress([]);
    expect(p.total).toBe(0);
    expect(p.ratio).toBe(0);
  });
});

describe('isComplete', () => {
  it('is false while anyone is pending', () => {
    expect(isComplete(rows)).toBe(false);
  });
  it('is true when everyone is resolved', () => {
    expect(
      isComplete([
        { profileId: 'a', memberName: 'Ada', status: 'complete' },
        { profileId: 'c', memberName: 'Chidi', status: 'exempt' },
      ])
    ).toBe(true);
  });
  it('is false for an empty campaign (nothing to celebrate)', () => {
    expect(isComplete([])).toBe(false);
  });
});

describe('pendingRows', () => {
  it('returns only pending members, name-sorted', () => {
    expect(pendingRows(rows).map((r) => r.memberName)).toEqual(['Bola', 'Dami']);
  });
});

describe('rollupByLocation', () => {
  it('groups by location with per-location progress, name-sorted', () => {
    const roll = rollupByLocation(rows);
    // localeCompare orders "Dallas" before "DC" (letter a < letter c).
    expect(roll.map((r) => r.locationName)).toEqual(['Dallas', 'DC']);
    const dc = roll.find((r) => r.locationName === 'DC')!;
    const dallas = roll.find((r) => r.locationName === 'Dallas')!;
    expect(dc.progress).toMatchObject({ total: 2, resolved: 1 }); // Ada complete, Bola pending
    expect(dallas.progress).toMatchObject({ total: 2, resolved: 1 }); // Chidi exempt, Dami pending
  });

  it('buckets rows without a location under Unassigned', () => {
    const roll = rollupByLocation([
      { profileId: 'x', memberName: 'X', status: 'pending', locationName: null },
    ]);
    expect(roll).toHaveLength(1);
    expect(roll[0].locationName).toBe('Unassigned');
  });
});
