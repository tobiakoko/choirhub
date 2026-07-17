import { deriveRsvp } from './rsvpState';
import type { ConfirmedRsvp, PendingRsvp } from './rsvpState';

const confirmed = (eventId: string, status: string, profileId = 'me'): ConfirmedRsvp => ({
  eventId,
  profileId,
  status,
});
const pending = (eventId: string, status: PendingRsvp['status'], seq: number): PendingRsvp => ({
  eventId,
  status,
  seq,
});

describe('deriveRsvp', () => {
  it('is null with no RSVP anywhere', () => {
    expect(deriveRsvp('e1', 'me', [], [])).toEqual({ status: null, pending: false });
  });

  it('reflects a confirmed server RSVP', () => {
    expect(deriveRsvp('e1', 'me', [confirmed('e1', 'yes')], [])).toEqual({
      status: 'yes',
      pending: false,
    });
  });

  it('ignores another member’s confirmed RSVP', () => {
    expect(deriveRsvp('e1', 'me', [confirmed('e1', 'yes', 'other')], [])).toEqual({
      status: null,
      pending: false,
    });
  });

  it('lets a queued intent override the confirmed row (pending)', () => {
    const result = deriveRsvp('e1', 'me', [confirmed('e1', 'yes')], [pending('e1', 'no', 5)]);
    expect(result).toEqual({ status: 'no', pending: true });
  });

  it('takes the newest queued intent when a member re-taps offline', () => {
    const result = deriveRsvp('e1', 'me', [], [
      pending('e1', 'yes', 3),
      pending('e1', 'maybe', 7),
      pending('e1', 'no', 5),
    ]);
    expect(result).toEqual({ status: 'maybe', pending: true });
  });

  it('scopes to the event', () => {
    expect(deriveRsvp('e1', 'me', [], [pending('e2', 'yes', 9)])).toEqual({
      status: null,
      pending: false,
    });
  });
});
