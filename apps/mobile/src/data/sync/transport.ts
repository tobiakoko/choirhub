// Production SyncTransport: calls the `sync` edge function. `functions.invoke`
// attaches the caller's Supabase JWT, so the pull runs under the member's RLS and
// the push writes only rows they're allowed to (§5, §6.1). Not imported by tests.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { PullResponse, PushMutation, PushResponse, SyncTransport } from './types';

export class SupabaseSyncTransport implements SyncTransport {
  constructor(private readonly supabase: SupabaseClient) {}

  async pull(lastPulledAt: string | null): Promise<PullResponse> {
    const { data, error } = await this.supabase.functions.invoke<PullResponse>('sync', {
      body: { action: 'pull', last_pulled_at: lastPulledAt },
    });
    if (error) throw error;
    if (!data) throw new Error('sync pull returned no body');
    return data;
  }

  async push(mutations: PushMutation[]): Promise<PushResponse> {
    const { data, error } = await this.supabase.functions.invoke<PushResponse>('sync', {
      body: { action: 'push', mutations },
    });
    if (error) throw error;
    if (!data) throw new Error('sync push returned no body');
    return data;
  }
}
