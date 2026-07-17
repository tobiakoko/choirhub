import { dueEscalations } from './escalation';

const HOUR = 3_600_000;
const now = Date.parse('2026-07-17T12:00:00Z');

describe('dueEscalations', () => {
  it('fires T-72h in the hour bucket 72h before the deadline', () => {
    expect(dueEscalations(now + 72 * HOUR, now)).toEqual(['T-72h']);
    expect(dueEscalations(now + 71.5 * HOUR, now)).toEqual(['T-72h']);
    // Just outside the bucket on either side.
    expect(dueEscalations(now + 72.5 * HOUR, now)).toEqual([]);
    expect(dueEscalations(now + 71 * HOUR, now)).toEqual([]);
  });

  it('fires T-24h in the hour bucket 24h before the deadline', () => {
    expect(dueEscalations(now + 24 * HOUR, now)).toEqual(['T-24h']);
    expect(dueEscalations(now + 23.25 * HOUR, now)).toEqual(['T-24h']);
    expect(dueEscalations(now + 23 * HOUR, now)).toEqual([]);
  });

  it('is silent between and outside the escalation windows', () => {
    expect(dueEscalations(now + 48 * HOUR, now)).toEqual([]);
    expect(dueEscalations(now + 100 * HOUR, now)).toEqual([]);
  });

  it('never fires for a past deadline', () => {
    expect(dueEscalations(now - HOUR, now)).toEqual([]);
    expect(dueEscalations(now, now)).toEqual([]);
  });
});
