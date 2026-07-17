// SMS fallback behind a provider interface (§6.3). Critical escalations fall back
// to SMS when push can't reach a member. Two adapters — Twilio (default corridor)
// and Termii (+234 / Nigeria) — are selected per-number by smsProviderForPhone.
//
// Env-gated, no real keys: an adapter whose credentials are absent returns
// { status: 'skipped' } instead of calling out, so the pipeline is safe to run in
// dev / CI with nothing configured. Wire real keys via Supabase function secrets
// (never committed): TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM,
// TERMII_API_KEY / TERMII_SENDER_ID.

import { smsProviderForPhone, type SmsProvider } from './notificationPolicy.ts';

export type SmsSendResult =
  | { status: 'sent'; provider: SmsProvider }
  | { status: 'skipped'; provider: SmsProvider; reason: 'unconfigured' }
  | { status: 'error'; provider: SmsProvider; error: string };

export interface SmsAdapter {
  readonly provider: SmsProvider;
  /** True when credentials are present; false → send() short-circuits to skipped. */
  readonly configured: boolean;
  send(to: string, body: string): Promise<SmsSendResult>;
}

function env(key: string): string | undefined {
  const value = Deno.env.get(key);
  return value && value.length > 0 ? value : undefined;
}

// ── Twilio ──────────────────────────────────────────────────────────────────
function twilioAdapter(): SmsAdapter {
  const sid = env('TWILIO_ACCOUNT_SID');
  const token = env('TWILIO_AUTH_TOKEN');
  const from = env('TWILIO_FROM');
  const configured = Boolean(sid && token && from);

  return {
    provider: 'twilio',
    configured,
    async send(to, body) {
      if (!configured) return { status: 'skipped', provider: 'twilio', reason: 'unconfigured' };
      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: from as string, Body: body }),
          }
        );
        if (!response.ok) {
          return { status: 'error', provider: 'twilio', error: `HTTP ${response.status}` };
        }
        return { status: 'sent', provider: 'twilio' };
      } catch (error) {
        return {
          status: 'error',
          provider: 'twilio',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

// ── Termii (+234 corridor) ────────────────────────────────────────────────────
function termiiAdapter(): SmsAdapter {
  const apiKey = env('TERMII_API_KEY');
  const sender = env('TERMII_SENDER_ID');
  const configured = Boolean(apiKey && sender);

  return {
    provider: 'termii',
    configured,
    async send(to, body) {
      if (!configured) return { status: 'skipped', provider: 'termii', reason: 'unconfigured' };
      try {
        const response = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            from: sender,
            sms: body,
            type: 'plain',
            channel: 'generic',
            api_key: apiKey,
          }),
        });
        if (!response.ok) {
          return { status: 'error', provider: 'termii', error: `HTTP ${response.status}` };
        }
        return { status: 'sent', provider: 'termii' };
      } catch (error) {
        return {
          status: 'error',
          provider: 'termii',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

const adapters: Record<SmsProvider, SmsAdapter> = {
  twilio: twilioAdapter(),
  termii: termiiAdapter(),
};

/** Adapter for a phone number, chosen by corridor (Termii for +234, else Twilio). */
export function smsAdapterForPhone(phone: string): SmsAdapter {
  return adapters[smsProviderForPhone(phone)];
}

/** Send an SMS fallback to a member, routing by corridor. */
export function sendSmsFallback(phone: string, body: string): Promise<SmsSendResult> {
  return smsAdapterForPhone(phone).send(phone, body);
}
