import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

/** Acknowledgment of a requires_ack announcement (server: public.acknowledgments).
 *  Read model for the leader's ack roll-up; also a push target — the member's own
 *  ack is written optimistically and queued in the outbox (§6.1). */
export class Acknowledgment extends Model {
  static table = Tables.acknowledgments;

  @text('announcement_id') announcementId!: string;
  @text('profile_id') profileId!: string;
  @text('client_uuid') clientUuid!: string;
  @text('acknowledged_at') acknowledgedAt!: string;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
