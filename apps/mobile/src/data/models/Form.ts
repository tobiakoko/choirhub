import { Model } from '@nozbe/watermelondb';
import { json, text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

const sanitizeFields = (raw: unknown): unknown[] => (Array.isArray(raw) ? raw : []);

/** Schema-driven form (server: public.forms). The renderer builds from `fields`;
 *  responses are submitted offline via the outbox (§6.1). */
export class Form extends Model {
  static table = Tables.forms;

  @text('region_id') regionId!: string;
  @text('location_id') locationId?: string;
  @text('author_id') authorId!: string;
  @text('title') title!: string;
  @json('fields', sanitizeFields) fields!: unknown[];
  @text('deadline') deadline?: string;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
