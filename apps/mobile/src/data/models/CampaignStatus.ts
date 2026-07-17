import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

/** Per-member compliance status (server: public.campaign_status). Read model for
 *  the compliance dashboard; also a push target — a leader's "mark paid" is
 *  written optimistically and queued in the outbox (§6.1). */
export class CampaignStatus extends Model {
  static table = Tables.campaignStatus;

  @text('campaign_id') campaignId!: string;
  @text('profile_id') profileId!: string;
  @text('status') status!: string;
  @text('marked_by') markedBy?: string;
  @text('client_uuid') clientUuid?: string;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
