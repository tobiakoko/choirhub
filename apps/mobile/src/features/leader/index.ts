// Public surface of the leader feature (docs/choirhub-system-design-v2.md §5).
// All leader affordances are role-gated by fetched roles (roles.ts / useLeaderRole)
// and every mutation is re-proven server-side by RLS — the client gate is a mirror,
// never the boundary (CLAUDE.md rule #2).

// Role gating
export { capabilitiesFor, canComposeAnnouncement } from './roles';
export type { LeaderCapabilities, UserRoleName } from './roles';
export { useLeaderRole } from './useLeaderRole';
export type { UseLeaderRole } from './useLeaderRole';

// Compose
export { LeaderFab } from './components/LeaderFab';
export { ComposeSheet } from './components/ComposeSheet';

// Compliance
export { ComplianceDashboard } from './components/ComplianceDashboard';

// Member management
export { MemberManagementScreen } from './components/MemberManagementScreen';
