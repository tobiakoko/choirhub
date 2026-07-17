// Pure mapping between the notification_prefs server row (0014) and the client
// NotificationPrefs shape. Kept pure + tested so the round-trip (defaults for a
// member who has never opened settings, category coercion, upsert payload) is
// verified without a live Supabase client.

import type { Category } from '@choirhub/ui';

import { defaultPrefs, type NotificationLanguage, type NotificationPrefs } from './types';

export interface NotificationPrefsRow {
  profile_id?: string;
  muted_categories: string[] | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  digest_hour: number | null;
  data_saver: boolean | null;
  language: string | null;
  timezone: string | null;
}

const CATEGORIES: readonly Category[] = [
  'rehearsal',
  'payment',
  'uniform',
  'forms',
  'logistics',
  'devotional',
  'critical',
];
const LANGUAGES: readonly NotificationLanguage[] = ['en', 'fr', 'yo'];

function coerceCategories(raw: string[] | null): Category[] {
  if (!raw) return [];
  return raw.filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c));
}

function coerceLanguage(raw: string | null): NotificationLanguage {
  return (LANGUAGES as readonly string[]).includes(raw ?? '')
    ? (raw as NotificationLanguage)
    : 'en';
}

/** Merge a server row over the defaults — a null row yields pure defaults. */
export function rowToPrefs(row: NotificationPrefsRow | null): NotificationPrefs {
  const base = defaultPrefs();
  if (!row) return base;
  return {
    mutedCategories: coerceCategories(row.muted_categories),
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    digestHour: row.digest_hour ?? base.digestHour,
    dataSaver: row.data_saver ?? base.dataSaver,
    language: coerceLanguage(row.language),
    timezone: row.timezone || base.timezone,
  };
}

/** Build the upsert payload for register/save. */
export function prefsToRow(profileId: string, prefs: NotificationPrefs): NotificationPrefsRow {
  return {
    profile_id: profileId,
    muted_categories: prefs.mutedCategories,
    quiet_hours_start: prefs.quietHoursStart,
    quiet_hours_end: prefs.quietHoursEnd,
    digest_hour: prefs.digestHour,
    data_saver: prefs.dataSaver,
    language: prefs.language,
    timezone: prefs.timezone,
  };
}
