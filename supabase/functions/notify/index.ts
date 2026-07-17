// `notify` edge function — on-publish fan-out (§6.3). The author's client kicks this
// after a successful publish with { announcement_id }. It runs under the *caller's*
// JWT (like sync), so it can only ever fan out an announcement the caller authored;
// recipient resolution + the authorship gate live in fanout_recipients (0015), the
// security boundary. Delivery is by priority tier: Critical/Important push (Critical
// overriding quiet hours), Normal is silent and left to the daily digest.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPush, type ExpoPushMessage } from '../_shared/expoPush.ts';
import {
  decideDelivery,
  localHourIn,
  type Priority,
} from '../_shared/notificationPolicy.ts';

interface Recipient {
  profile_id: string;
  token: string;
  platform: string;
  phone: string | null;
  muted: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  digest_hour: number | null;
  timezone: string;
  language: string;
}

interface Announcement {
  title: string;
  body: string;
  priority: Priority;
  category: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );

  let body: { announcement_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }
  const announcementId = body.announcement_id;
  if (!announcementId) return jsonResponse({ error: 'announcement_id required' }, 400);

  const { data: ann, error: annError } = await supabase
    .from('announcements')
    .select('title, body, priority, category')
    .eq('id', announcementId)
    .single<Announcement>();
  if (annError || !ann) return jsonResponse({ error: 'announcement not found' }, 404);

  const { data: recipients, error: recError } = await supabase.rpc('fanout_recipients', {
    p_announcement_id: announcementId,
  });
  if (recError) return jsonResponse({ error: recError.message }, 403);

  const messages: ExpoPushMessage[] = [];
  let suppressed = 0;
  for (const r of (recipients ?? []) as Recipient[]) {
    const decision = decideDelivery({
      priority: ann.priority,
      category: ann.category,
      mutedCategories: r.muted ? [ann.category] : [],
      localHour: localHourIn(r.timezone),
      quietHours: { start: r.quiet_hours_start, end: r.quiet_hours_end },
    });
    if (!decision.deliver) {
      suppressed += 1;
      continue;
    }
    messages.push({
      to: r.token,
      title: ann.title,
      body: ann.body,
      data: { type: 'announcement', id: announcementId },
      channelId: decision.channel,
      priority: decision.channel === 'critical' ? 'high' : 'default',
      sound: 'default',
    });
  }

  const expo = await sendExpoPush(messages);
  return jsonResponse({
    announcement_id: announcementId,
    recipients: (recipients ?? []).length,
    delivered: expo.sent,
    suppressed,
    errors: expo.errors,
  });
});
