import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from './env';
import { secureStoreAdapter } from './secureStore';

assertSupabaseEnv();

/**
 * The single Supabase client. Sessions persist in the device keystore via
 * expo-secure-store (secureStoreAdapter) and auto-refresh while the app is
 * foregrounded. `detectSessionInUrl` is off — there is no browser redirect in a
 * phone-OTP flow.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is active; pause the timer in the background
// (recommended Supabase Expo pattern) to avoid needless work on 2G/low-end devices.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
