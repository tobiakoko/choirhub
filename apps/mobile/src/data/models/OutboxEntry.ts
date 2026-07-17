import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

/** A queued light write awaiting push (server has none — local-only). Drained FIFO
 *  by `seq`, deduped by `clientUuid`; `attempts` drives exponential backoff (§6.1). */
export class OutboxEntry extends Model {
  static table = Tables.outbox;

  @text('client_uuid') clientUuid!: string;
  @text('mutation_type') mutationType!: string;
  @text('payload') payload!: string;
  @field('seq') seq!: number;
  @field('attempts') attempts!: number;
  @text('enqueued_at') enqueuedAt!: string;
}
