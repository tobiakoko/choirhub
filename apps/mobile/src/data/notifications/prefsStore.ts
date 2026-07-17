// Notification-preferences store. Local-first (rule #3): every settings read
// renders from the WatermelonDB-backed cache so the screen works offline; changes
// write through to public.notification_prefs so the digest/escalation crons and the
// fan-out see them. Data Saver is also pushed into the media cache's network gate.

import { create } from 'zustand';

import { database } from '@/data/database';
import { setDataSaver } from '@/data/media';
import { supabase } from '@/data/supabase';

import { prefsToRow, rowToPrefs, type NotificationPrefsRow } from './prefsMapping';
import { defaultPrefs, type NotificationPrefs } from './types';

const LOCAL_KEY = 'notification.prefs';

async function readCache(): Promise<NotificationPrefs | null> {
  const raw = await database.localStorage.get<string>(LOCAL_KEY);
  if (!raw) return null;
  try {
    return { ...defaultPrefs(), ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return null;
  }
}

async function writeCache(prefs: NotificationPrefs): Promise<void> {
  await database.localStorage.set(LOCAL_KEY, JSON.stringify(prefs));
}

interface PrefsState {
  prefs: NotificationPrefs;
  loaded: boolean;
  /** Hydrate from cache, then reconcile with the server (creating a default row
   *  the first time so the member participates in the digest). */
  load: (profileId?: string) => Promise<void>;
  /** Patch prefs: update UI immediately, persist locally, upsert to the server. */
  update: (patch: Partial<NotificationPrefs>, profileId?: string) => Promise<void>;
}

export const useNotificationPrefsStore = create<PrefsState>((set, get) => ({
  prefs: defaultPrefs(),
  loaded: false,

  load: async (profileId) => {
    const cached = await readCache();
    if (cached) {
      set({ prefs: cached, loaded: true });
      setDataSaver(cached.dataSaver);
    }

    if (!profileId) {
      set({ loaded: true });
      return;
    }

    const { data, error } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) {
      set({ loaded: true });
      return;
    }

    if (data) {
      const prefs = rowToPrefs(data as NotificationPrefsRow);
      set({ prefs, loaded: true });
      setDataSaver(prefs.dataSaver);
      await writeCache(prefs);
    } else {
      // First run: persist defaults (with the device timezone) so the cron sees us.
      const prefs = get().prefs;
      await supabase
        .from('notification_prefs')
        .upsert(prefsToRow(profileId, prefs), { onConflict: 'profile_id' });
      await writeCache(prefs);
      set({ loaded: true });
    }
  },

  update: async (patch, profileId) => {
    const next = { ...get().prefs, ...patch };
    set({ prefs: next });
    setDataSaver(next.dataSaver);
    await writeCache(next);
    if (profileId) {
      await supabase
        .from('notification_prefs')
        .upsert(prefsToRow(profileId, next), { onConflict: 'profile_id' });
    }
  },
}));
