// `notify-escalation` edge function — deadline escalation (§6.3). Invoked hourly by
// pg_cron (0015). For each campaign with a live deadline it asks which tiers are due
// this hour (T-72h / T-24h), claims each tier's idempotency latch (record_escalation)
// so it fires at most once, then re-notifies only the members still pending —
// automating the manual chasing seen in the WhatsApp history. At the final tier it
// also attempts the SMS fallback (Twilio/Termii, env-gated). Service-role only.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPush, type ExpoPushMessage } from '../_shared/expoPush.ts';
import { dueEscalations, type EscalationTier } from '../_shared/notificationPolicy.ts';
import { sendSmsFallback } from '../_shared/sms.ts';

interface Candidate {
  campaign_id: string;
  title: string;
  deadline: string;
  pending_count: number;
}

interface PendingRecipient {
  profile_id: string;
  token: string;
  platform: string;
  phone: string | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  timezone: string;
  language: string;
}

const SMS_FALLBACK_TIER: EscalationTier = 'T-24h';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const { data: candidates, error } = await supabase.rpc('escalation_candidates');
  if (error) return jsonResponse({ error: error.message }, 500);

  const now = Date.now();
  let pushed = 0;
  let smsSent = 0;
  const fired: { campaign_id: string; tier: EscalationTier; pending: number }[] = [];

  for (const c of (candidates ?? []) as Candidate[]) {
    const tiers = dueEscalations(Date.parse(c.deadline), now);
    for (const tier of tiers) {
      // Claim the latch; only proceed if this run is the first to fire this tier.
      const { data: won } = await supabase.rpc('record_escalation', {
        p_campaign_id: c.campaign_id,
        p_tier: tier,
      });
      if (won !== true) continue;

      const { data: recipients } = await supabase.rpc('escalation_recipients', {
        p_campaign_id: c.campaign_id,
      });
      const pending = (recipients ?? []) as PendingRecipient[];

      // Deadline reminders are the escalation itself — they push on the default
      // channel and intentionally bypass quiet hours.
      const messages: ExpoPushMessage[] = pending.map((r) => ({
        to: r.token,
        title: `Reminder: ${c.title}`,
        body: `This is still pending — the deadline is approaching (${tier}).`,
        data: { type: 'campaign', id: c.campaign_id },
        channelId: 'default',
        priority: 'high',
        sound: 'default',
      }));
      const expo = await sendExpoPush(messages);
      pushed += expo.sent;

      // Final tier: SMS fallback (no-op unless a provider is configured).
      if (tier === SMS_FALLBACK_TIER) {
        for (const r of pending) {
          if (!r.phone) continue;
          const result = await sendSmsFallback(
            r.phone,
            `Reminder: "${c.title}" is still pending. Please complete it before the deadline.`
          );
          if (result.status === 'sent') smsSent += 1;
        }
      }

      fired.push({ campaign_id: c.campaign_id, tier, pending: pending.length });
    }
  }

  return jsonResponse({ candidates: (candidates ?? []).length, fired, pushed, smsSent });
});
