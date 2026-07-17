// Derives the viewer's current RSVP for an event, reconciling confirmed server
// rows with queued offline intents. A member can change their mind repeatedly
// offline; the newest queued tap (highest outbox seq) wins, and the control shows
// it as pending (🕓) until the server confirms (§6.1).

export type RsvpStatus = 'yes' | 'no' | 'maybe';

/** A confirmed RSVP row mirrored locally (server: rsvps). */
export interface ConfirmedRsvp {
  eventId: string;
  profileId: string;
  status: string;
}

/** A queued RSVP intent parsed from the outbox. */
export interface PendingRsvp {
  eventId: string;
  status: RsvpStatus;
  /** Outbox FIFO key — the highest wins when a member re-taps offline. */
  seq: number;
}

export interface RsvpView {
  status: RsvpStatus | null;
  /** True while a queued intent hasn't been confirmed by the server. */
  pending: boolean;
}

export function deriveRsvp(
  eventId: string,
  viewerProfileId: string,
  confirmed: readonly ConfirmedRsvp[],
  pending: readonly PendingRsvp[]
): RsvpView {
  const queued = pending.filter((p) => p.eventId === eventId);
  if (queued.length > 0) {
    const latest = queued.reduce((a, b) => (b.seq > a.seq ? b : a));
    return { status: latest.status, pending: true };
  }
  const mine = confirmed.find((c) => c.eventId === eventId && c.profileId === viewerProfileId);
  return { status: (mine?.status as RsvpStatus | undefined) ?? null, pending: false };
}
