// Production WatermelonDB instance. SQLite (JSI) is the on-device store; every
// read renders from here so the app is fully usable offline (CLAUDE.md rule 3).
// This module is the composition root for local persistence — tests never import
// it; they exercise the sync engine against in-memory ports instead.

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { modelClasses, schema } from './models';

const adapter = new SQLiteAdapter({
  dbName: 'choirhub',
  schema,
  jsi: true,
  onSetUpError: (error) => {
    // A corrupt/locked DB must not brick launch; surface for telemetry (§8 Sentry).
    console.error('[choirhub] WatermelonDB setup failed', error);
  },
});

export const database = new Database({ adapter, modelClasses });
