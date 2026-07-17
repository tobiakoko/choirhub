import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

/** Targeting row for an announcement (server: public.audiences). The client reads
 *  these to know which announcements resolve to it; RLS only returns audience rows
 *  for announcements the caller may see (§5). */
export class Audience extends Model {
  static table = Tables.audiences;

  @text('announcement_id') announcementId!: string;
  @text('target_type') targetType!: string;
  @text('target_id') targetId?: string;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
