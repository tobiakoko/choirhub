// Expo Push transport (§6.3). The delivery jobs hand this a batch of messages; it
// posts them to the Expo push service in chunks of 100 (the service's per-request
// cap) and returns the tickets. No secrets: Expo push needs no server key for
// tokens minted by our own project. Kept transport-only so the routing decisions
// live in notificationPolicy.ts.

import type { AndroidChannelId } from './notificationPolicy.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: AndroidChannelId;
  /** 'high' for Critical/Important heads-up; 'normal' for the silent digest. */
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
}

export interface ExpoPushResult {
  sent: number;
  tickets: unknown[];
  errors: string[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Send a batch of push messages. Never throws — failures are collected so one bad
 *  chunk can't sink the rest of the fan-out. */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushResult> {
  const result: ExpoPushResult = { sent: 0, tickets: [], errors: [] };
  if (messages.length === 0) return result;

  for (const batch of chunk(messages, CHUNK_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        result.errors.push(`expo push HTTP ${response.status}`);
        continue;
      }
      const json = (await response.json()) as { data?: unknown[] };
      if (json.data) result.tickets.push(...json.data);
      result.sent += batch.length;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return result;
}
