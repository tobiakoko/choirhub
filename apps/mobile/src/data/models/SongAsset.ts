import { Model } from '@nozbe/watermelondb';
import { json, text } from '@nozbe/watermelondb/decorators';

import { Tables } from './schema';

const sanitizeRenditions = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

/** Per-voice-part song asset (server: public.song_assets). lyrics/solfa carry
 *  `content` text (never LRU-evicted, §6.2); part_audio/score_pdf carry only the
 *  `renditions` pointer — the media cache resolves the actual file. */
export class SongAsset extends Model {
  static table = Tables.songAssets;

  @text('song_id') songId!: string;
  @text('asset_type') assetType!: string;
  @text('voice_part') voicePart?: string;
  @text('content') content?: string;
  @text('storage_path') storagePath?: string;
  @json('renditions', sanitizeRenditions) renditions!: Record<string, unknown>;
  @text('server_updated_at') serverUpdatedAt!: string;
  @text('deleted_at') deletedAt?: string;
}
