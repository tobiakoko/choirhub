import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

/** Broadcast announcement (server: public.announcements). Read model — the feed
 *  renders from here so it works fully offline (§6.1). */
export class Announcement extends Model {
  static table = Tables.announcements;

  @text('author_id') authorId!: string;
  @text('category') category!: string;
  @text('priority') priority!: string;
  @field('pinned') pinned!: boolean;
  @field('requires_ack') requiresAck!: boolean;
  @text('title') title!: string;
  @text('body') body!: string;
  @text('publish_at') publishAt!: string;
  @text('expires_at') expiresAt?: string;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
