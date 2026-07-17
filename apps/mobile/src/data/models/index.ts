// WatermelonDB model registry. The list feeds `new Database({ modelClasses })`;
// it mirrors the nine server read tables plus the local outbox.

import { Acknowledgment } from './Acknowledgment';
import { Announcement } from './Announcement';
import { Audience } from './Audience';
import { CampaignStatus } from './CampaignStatus';
import { Event } from './Event';
import { Form } from './Form';
import { OutboxEntry } from './OutboxEntry';
import { Rsvp } from './Rsvp';
import { Song } from './Song';
import { SongAsset } from './SongAsset';

export const modelClasses = [
  Announcement,
  Audience,
  Event,
  Rsvp,
  Song,
  SongAsset,
  Form,
  CampaignStatus,
  Acknowledgment,
  OutboxEntry,
];

export {
  Acknowledgment,
  Announcement,
  Audience,
  CampaignStatus,
  Event,
  Form,
  OutboxEntry,
  Rsvp,
  Song,
  SongAsset,
};
export { Tables, SYNC_TABLES, schema } from './schema';
export type { SyncTableName } from './schema';
