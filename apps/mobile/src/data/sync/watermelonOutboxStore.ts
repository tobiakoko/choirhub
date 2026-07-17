// Production OutboxStore: the queue persisted as rows in the WatermelonDB `outbox`
// table, so pending writes survive an app kill (§6.1). Not imported by tests.

import { Database, Q } from '@nozbe/watermelondb';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';

import { Tables } from '../models/schema';
import type { MutationPayload, MutationType, OutboxRecord, OutboxStore } from './types';

function toRecord(raw: DirtyRaw): OutboxRecord {
  return {
    clientUuid: raw.client_uuid as string,
    type: raw.mutation_type as MutationType,
    payload: JSON.parse(raw.payload as string) as MutationPayload,
    seq: raw.seq as number,
    attempts: raw.attempts as number,
    createdAt: raw.enqueued_at as string,
  };
}

export class WatermelonOutboxStore implements OutboxStore {
  constructor(private readonly database: Database) {}

  private get collection() {
    return this.database.get(Tables.outbox);
  }

  async all(): Promise<OutboxRecord[]> {
    const rows = await this.collection.query(Q.sortBy('seq', Q.asc)).fetch();
    return rows.map((rec) => toRecord(rec._raw as DirtyRaw));
  }

  async add(record: OutboxRecord): Promise<void> {
    await this.database.write(async () => {
      await this.collection.create((rec) => {
        rec._raw.id = record.clientUuid;
        Object.assign(rec._raw, {
          client_uuid: record.clientUuid,
          mutation_type: record.type,
          payload: JSON.stringify(record.payload),
          seq: record.seq,
          attempts: record.attempts,
          enqueued_at: record.createdAt,
        });
      });
    });
  }

  async update(record: OutboxRecord): Promise<void> {
    await this.database.write(async () => {
      const rows = await this.collection
        .query(Q.where('client_uuid', record.clientUuid))
        .fetch();
      const rec = rows[0];
      if (!rec) return;
      await rec.update(() => {
        Object.assign(rec._raw, { attempts: record.attempts });
      });
    });
  }

  async remove(clientUuid: string): Promise<void> {
    await this.database.write(async () => {
      const rows = await this.collection.query(Q.where('client_uuid', clientUuid)).fetch();
      await this.database.batch(...rows.map((rec) => rec.prepareDestroyPermanently()));
    });
  }
}
