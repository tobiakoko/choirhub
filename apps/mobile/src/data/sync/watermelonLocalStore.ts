// Production LocalStore: reconciled pull changes land in WatermelonDB, and queued
// mutations write an optimistic row so the UI updates immediately (§6.1). Not
// imported by tests — the engine is exercised against an in-memory LocalStore.

import { Database, Q } from '@nozbe/watermelondb';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';

import { schema } from '../models/schema';
import { toOptimisticRow } from './mutations';
import type { LocalStore, OutboxRecord, PullRow, SyncTableName } from './types';

// Columns whose schema type is 'string' but whose wire value is a JSON array/object
// (tags, renditions, form fields) — serialised on the way into SQLite.
function encodeValue(value: unknown): DirtyRaw[string] {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return value as DirtyRaw[string];
}

/** Build a WatermelonDB dirty raw from a wire row, mapping the server's
 *  `updated_at` onto our `server_updated_at` bookkeeping column. */
function toDirtyRaw(table: SyncTableName, row: PullRow): DirtyRaw {
  const raw: DirtyRaw = { id: row.id };
  for (const col of schema.tables[table].columnArray) {
    raw[col.name] = col.name === 'server_updated_at' ? row.updated_at : encodeValue(row[col.name]);
  }
  raw.deleted_at = row.deleted_at ?? null;
  return raw;
}

export class WatermelonLocalStore implements LocalStore {
  constructor(
    private readonly database: Database,
    /** Current member id — stamps optimistic ack/RSVP rows. */
    private readonly getProfileId: () => string
  ) {}

  async getRows(table: SyncTableName): Promise<PullRow[]> {
    const records = await this.database.get(table).query().fetch();
    return records.map((rec) => {
      const raw = rec._raw as DirtyRaw;
      return {
        id: raw.id as string,
        updated_at: (raw.server_updated_at as string) ?? '',
        deleted_at: (raw.deleted_at as string | null) ?? null,
        client_uuid: raw.client_uuid as string | undefined,
      };
    });
  }

  async applyChanges(
    table: SyncTableName,
    upserts: PullRow[],
    deletedIds: string[]
  ): Promise<void> {
    if (upserts.length === 0 && deletedIds.length === 0) return;
    const collection = this.database.get(table);

    await this.database.write(async () => {
      const touchedIds = [...upserts.map((r) => r.id), ...deletedIds];
      const existing = await collection.query(Q.where('id', Q.oneOf(touchedIds))).fetch();
      const existingById = new Map(existing.map((rec) => [rec.id, rec]));

      const batch = [
        ...upserts.map((row) => {
          const current = existingById.get(row.id);
          const raw = toDirtyRaw(table, row);
          if (current) {
            return current.prepareUpdate((rec) => {
              Object.assign(rec._raw, raw);
            });
          }
          return collection.prepareCreateFromDirtyRaw(raw);
        }),
        ...deletedIds
          .map((id) => existingById.get(id))
          .filter((rec): rec is NonNullable<typeof rec> => rec != null)
          .map((rec) => rec.prepareDestroyPermanently()),
      ];

      await this.database.batch(...batch);
    });
  }

  async applyOptimistic(record: OutboxRecord): Promise<void> {
    const mapped = toOptimisticRow(record, this.getProfileId(), new Date().toISOString());
    if (!mapped) return;
    await this.applyChanges(mapped.table, [mapped.row], []);
  }
}
