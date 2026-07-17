import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

/** RSVP to an event (server: public.rsvps). Also a push target: a member's own
 *  RSVP is written optimistically here and queued in the outbox (§6.1). */
export class Rsvp extends Model {
  static table = Tables.rsvps;

  @text('event_id') eventId!: string;
  @text('profile_id') profileId!: string;
  @text('status') status!: string;
  @text('client_uuid') clientUuid!: string;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
