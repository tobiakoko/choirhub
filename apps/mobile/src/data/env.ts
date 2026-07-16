/**
 * Public runtime configuration. Only EXPO_PUBLIC_* values are inlined into the
 * client bundle (CLAUDE.md §5) — the service-role key never carries that prefix
 * and so can never reach app code. Do not read .env directly; these are the only
 * sanctioned inputs.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function assertSupabaseEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.'
    );
  }
}
