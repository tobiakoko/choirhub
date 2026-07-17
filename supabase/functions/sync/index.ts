// `sync` edge function — the client's single door to the server (system design
// §6.1).
//
//   POST { action: "pull", last_pulled_at }  → delta of text-only rows changed
//                                               since the cursor, scoped by RLS.
//   POST { action: "push", mutations }        → idempotent upserts of the four
//                                               light writes, keyed by client UUID.
//
// Security: we build the Supabase client with the *caller's* JWT (never the
// service role), so Postgres RLS is the one enforcement point (§8). A member only
// ever pulls rows they may read and only ever writes rows they may write; the
// function contains no permission logic of its own.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

// The nine read tables and their text-only column projections. No media blobs are
// ever selected — audio/PDF stay on the CDN and are fetched by the media cache
// (§6.2), keeping the first sync payload within the ≤50KB budget (§7).
const PULL_TABLES: Record<string, string> = {
  announcements:
    'id, author_id, category, priority, pinned, requires_ack, title, body, publish_at, expires_at, updated_at, deleted_at',
  audiences: 'id, announcement_id, target_type, target_id, updated_at, deleted_at',
  events:
    'id, region_id, location_id, author_id, title, description, starts_at, ends_at, uniform_directive, meeting_url, recurrence_rule, updated_at, deleted_at',
  rsvps: 'id, event_id, profile_id, status, client_uuid, updated_at, deleted_at',
  songs: 'id, region_id, title, composer, song_key, tempo, tags, updated_at, deleted_at',
  song_assets:
    'id, song_id, asset_type, voice_part, content, storage_path, renditions, updated_at, deleted_at',
  forms: 'id, region_id, location_id, author_id, title, fields, deadline, updated_at, deleted_at',
  campaign_status:
    'id, campaign_id, profile_id, status, marked_by, client_uuid, updated_at, deleted_at',
  acknowledgments:
    'id, announcement_id, profile_id, client_uuid, acknowledged_at, updated_at, deleted_at',
};

const PULL_ROW_LIMIT = 1000;

type PushMutation = {
  client_uuid: string;
  type: 'ack' | 'rsvp' | 'form_response' | 'mark_paid';
  payload: Record<string, unknown>;
};

type PushResult = {
  client_uuid: string;
  status: 'applied' | 'rejected';
  error?: string;
};

async function handlePull(
  supabase: SupabaseClient,
  lastPulledAt: string | null
): Promise<Response> {
  // Capture the cursor up front and bound the window to it, so a row written mid
  // query is simply picked up by the next pull rather than skipped.
  const cursor = new Date().toISOString();
  const tables: Record<string, unknown[]> = {};

  for (const [table, columns] of Object.entries(PULL_TABLES)) {
    let query = supabase.from(table).select(columns).lte('updated_at', cursor);
    if (lastPulledAt) query = query.gt('updated_at', lastPulledAt);
    query = query.order('updated_at', { ascending: true }).limit(PULL_ROW_LIMIT);

    const { data, error } = await query;
    if (error) {
      return jsonResponse({ error: `pull failed on ${table}: ${error.message}` }, 500);
    }
    tables[table] = data ?? [];
  }

  return jsonResponse({ timestamp: cursor, tables });
}

async function applyMutation(
  supabase: SupabaseClient,
  userId: string,
  mutation: PushMutation
): Promise<PushResult> {
  const { client_uuid, type, payload } = mutation;
  const base = { client_uuid };

  // Each upsert targets the row's natural key. RLS decides whether the write is
  // allowed; a rejected row is reported and skipped, never retried by the client.
  let table: string;
  let row: Record<string, unknown>;
  let onConflict: string;

  switch (type) {
    case 'ack':
      table = 'acknowledgments';
      onConflict = 'announcement_id,profile_id';
      row = {
        ...base,
        announcement_id: payload.announcement_id,
        profile_id: userId,
        acknowledged_at: payload.acknowledged_at ?? new Date().toISOString(),
      };
      break;
    case 'rsvp':
      table = 'rsvps';
      onConflict = 'event_id,profile_id';
      row = { ...base, event_id: payload.event_id, profile_id: userId, status: payload.status };
      break;
    case 'form_response':
      table = 'form_responses';
      onConflict = 'form_id,profile_id';
      row = { ...base, form_id: payload.form_id, profile_id: userId, response: payload.response };
      break;
    case 'mark_paid':
      table = 'campaign_status';
      onConflict = 'campaign_id,profile_id';
      row = {
        ...base,
        campaign_id: payload.campaign_id,
        profile_id: payload.profile_id,
        status: payload.status,
        marked_by: userId,
      };
      break;
    default:
      return { client_uuid, status: 'rejected', error: `unknown mutation type: ${type}` };
  }

  const { error } = await supabase.from(table).upsert(row, { onConflict });
  if (error) return { client_uuid, status: 'rejected', error: error.message };
  return { client_uuid, status: 'applied' };
}

async function handlePush(
  supabase: SupabaseClient,
  userId: string,
  mutations: PushMutation[]
): Promise<Response> {
  const results: PushResult[] = [];
  // Apply in the order the client queued them (last-write-wins on conflict).
  for (const mutation of mutations) {
    results.push(await applyMutation(supabase, userId, mutation));
  }
  return jsonResponse({ results, timestamp: new Date().toISOString() });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  // Bind the caller's JWT so every query runs under their RLS (§8).
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: 'not authenticated' }, 401);
  }

  let body: { action?: string; last_pulled_at?: string | null; mutations?: PushMutation[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  switch (body.action) {
    case 'pull':
      return handlePull(supabase, body.last_pulled_at ?? null);
    case 'push':
      return handlePush(supabase, userData.user.id, body.mutations ?? []);
    default:
      return jsonResponse({ error: 'action must be "pull" or "push"' }, 400);
  }
});
