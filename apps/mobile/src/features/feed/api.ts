// Resolves the signed-in member into a feed Viewer: their display name + scope
// (region / location / groups) for the personalized header and the presentational
// audience filter, plus whether they hold any leader role (gates the completion
// bar, §5). Read over the network and cached by TanStack Query; the feed itself
// renders from WatermelonDB and never blocks on this — an unresolved viewer just
// means "show everything RLS already sent" (viewer.ts).

import { supabase } from '@/data/supabase';

import type { Viewer } from './viewer';

/** Roles above plain member — any grant of one makes the completion bar visible. */
const LEADER_ROLES = ['committee_lead', 'location_leader', 'regional_coordinator'];

export interface ResolvedViewer {
  viewer: Viewer;
  displayName: string;
  locationName: string | null;
  voicePart: string | null;
  isLeader: boolean;
}

interface ProfileRow {
  id: string;
  display_name: string;
  location_id: string | null;
  voice_part: string | null;
  locations: { region_id: string; name: string } | null;
}

/**
 * Fetch profile + scope + leader flag for the current user in three small reads.
 * Returns null when there is no authenticated user (the gate never routes here
 * without one, but the feed stays defensive).
 */
export async function fetchViewer(userId: string): Promise<ResolvedViewer> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, location_id, voice_part, locations(region_id, name)')
    .eq('id', userId)
    .single<ProfileRow>();
  if (error) throw error;

  const locationId = profile.location_id;
  const regionId = profile.locations?.region_id ?? null;
  const voicePart = profile.voice_part;

  // Group scope: committee/sub-choir memberships plus the viewer's voice-part group
  // (matched by location + part, since voice-part membership is implicit).
  const groupIds = new Set<string>();

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('profile_id', userId)
    .is('deleted_at', null);
  for (const m of memberships ?? []) groupIds.add(m.group_id as string);

  if (locationId && voicePart) {
    const { data: vpGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('location_id', locationId)
      .eq('type', 'voice_part')
      .eq('voice_part', voicePart)
      .is('deleted_at', null);
    for (const g of vpGroups ?? []) groupIds.add(g.id as string);
  }

  const { data: roles } = await supabase
    .from('roles')
    .select('role')
    .eq('profile_id', userId)
    .is('deleted_at', null);
  const isLeader = (roles ?? []).some((r) => LEADER_ROLES.includes(r.role as string));

  return {
    viewer: { profileId: userId, regionId, locationId, groupIds },
    displayName: profile.display_name,
    locationName: profile.locations?.name ?? null,
    voicePart,
    isLeader,
  };
}
