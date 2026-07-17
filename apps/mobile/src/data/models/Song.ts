import { Model } from '@nozbe/watermelondb';
import { field, json, text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

const sanitizeTags = (raw: unknown): string[] => (Array.isArray(raw) ? (raw as string[]) : []);

/** Song in the offline repertoire (server: public.songs). Audio never lands here —
 *  only text/metadata; renditions are fetched by the media cache (§6.2). */
export class Song extends Model {
  static table = Tables.songs;

  @text('region_id') regionId!: string;
  @text('title') title!: string;
  @text('composer') composer?: string;
  @text('song_key') songKey?: string;
  @field('tempo') tempo?: number;
  @json('tags', sanitizeTags) tags!: string[];
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
