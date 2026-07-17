import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

/** Rehearsal / schedule event (server: public.events). */
export class Event extends Model {
  static table = Tables.events;

  @text('region_id') regionId!: string;
  @text('location_id') locationId?: string;
  @text('author_id') authorId!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @text('starts_at') startsAt!: string;
  @text('ends_at') endsAt?: string;
  @text('uniform_directive') uniformDirective?: string;
  @text('meeting_url') meetingUrl?: string;
  @text('recurrence_rule') recurrenceRule?: string;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
