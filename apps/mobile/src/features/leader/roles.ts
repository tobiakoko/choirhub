// Role → capability mapping for the leader UI (docs/choirhub-system-design-v2.md
// §5 permission matrix). This is a *presentational gate*, never the security
// boundary: it decides which leader affordances render (the FAB, the compliance
// dashboard, member management), but every mutation those affordances drive is
// re-proven server-side by RLS (CLAUDE.md rule #2). A patched client that forces
// `canCompose` true still cannot insert an announcement — the announcements
// INSERT policy rejects a non-author role.

/** The scoped roles a profile can hold (server enum public.user_role). */
export type UserRoleName =
  | 'member'
  | 'committee_lead'
  | 'location_leader'
  | 'regional_coordinator';

/** Roles above plain member — any grant of one unlocks the compose FAB. */
const CONTENT_AUTHOR_ROLES: readonly UserRoleName[] = [
  'committee_lead',
  'location_leader',
  'regional_coordinator',
];

/** Roles that may raise Critical priority (SMS fallback) and manage members. */
const LOCATION_AUTHORITY_ROLES: readonly UserRoleName[] = [
  'location_leader',
  'regional_coordinator',
];

/** What the leader surface should offer this viewer. Derived purely from roles. */
export interface LeaderCapabilities {
  /** Show the compose FAB (§5: post to committee / location / region). */
  canCompose: boolean;
  /** Offer the Critical delivery tier (§5: location leader / coordinator only). */
  canSetCritical: boolean;
  /** Show member management — approve joins + invite codes (§5). */
  canManageMembers: boolean;
  /** Region coordinator: unlocks the cross-location compliance roll-up (§5). */
  isCoordinator: boolean;
}

const NONE: LeaderCapabilities = {
  canCompose: false,
  canSetCritical: false,
  canManageMembers: false,
  isCoordinator: false,
};

function hasAny(roles: readonly UserRoleName[], wanted: readonly UserRoleName[]): boolean {
  return roles.some((r) => wanted.includes(r));
}

/** Map a viewer's held roles to their leader capabilities (§5). A member — or an
 *  unresolved viewer (empty list) — gets nothing, so the FAB never renders for
 *  them. */
export function capabilitiesFor(roles: readonly UserRoleName[]): LeaderCapabilities {
  if (roles.length === 0) return NONE;
  return {
    canCompose: hasAny(roles, CONTENT_AUTHOR_ROLES),
    canSetCritical: hasAny(roles, LOCATION_AUTHORITY_ROLES),
    canManageMembers: hasAny(roles, LOCATION_AUTHORITY_ROLES),
    isCoordinator: roles.includes('regional_coordinator'),
  };
}

/** True when the viewer may open the compose sheet at all — the FAB's gate. */
export function canComposeAnnouncement(roles: readonly UserRoleName[]): boolean {
  return capabilitiesFor(roles).canCompose;
}
