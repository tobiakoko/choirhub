// `notify-digest` edge function — the daily digest job (§6.3). Invoked hourly by
// pg_cron (0015). Runs under the service role; digest_recipients() returns only the
// members whose *local* digest hour is now, each with the Normal-priority posts
// they haven't been pushed. Those are folded into one silent digest push per member.
// Service-role only: the resolver rejects any authenticated caller.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPush, type ExpoPushMessage } from '../_shared/expoPush.ts';
import { buildDigest, type DigestItem } from '../_shared/notificationPolicy.ts';

interface DigestRow {
  profile_id: string;
  token: string;
  platform: string;
  timezone: string;
  language: string;
  items: DigestItem[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const { data: rows, error } = await supabase.rpc('digest_recipients');
  if (error) return jsonResponse({ error: error.message }, 500);

  const messages: ExpoPushMessage[] = [];
  for (const row of (rows ?? []) as DigestRow[]) {
    const digest = buildDigest(row.items ?? []);
    if (!digest) continue;
    messages.push({
      to: row.token,
      title: digest.title,
      body: digest.body,
      data: { type: 'digest' },
      channelId: 'silent',
      priority: 'normal',
      sound: null,
    });
  }

  const expo = await sendExpoPush(messages);
  return jsonResponse({
    due: (rows ?? []).length,
    delivered: expo.sent,
    errors: expo.errors,
  });
});
