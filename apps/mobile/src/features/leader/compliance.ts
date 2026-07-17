// The compliance dashboard's pure view-model (§5 compliance / mark paid). Turns
// per-member campaign_status rows into the progress bar, the pending list, and the
// coordinator's cross-location roll-up. All pure — the hook feeds it live rows,
// tests feed plain objects. Marking a member paid is an outbox light-write
// (useMarkPaid); this module only shapes what the screen renders.

import type { CampaignState } from '@/data/sync';

/** One member's status on a campaign, joined with their display fields. */
export interface ComplianceRow {
  profileId: string;
  memberName: string;
  status: CampaignState;
  /** Present for the coordinator roll-up; a single-location leader can omit it. */
  locationName?: string | null;
}

/** Campaign progress. `resolved` = complete + exempt (both close a member out);
 *  `ratio` drives the cyan gradient fill (0 when the campaign has no members). */
export interface CampaignProgress {
  complete: number;
  exempt: number;
  pending: number;
  total: number;
  resolved: number;
  ratio: number;
}

export function campaignProgress(rows: readonly ComplianceRow[]): CampaignProgress {
  let complete = 0;
  let exempt = 0;
  let pending = 0;
  for (const r of rows) {
    if (r.status === 'complete') complete += 1;
    else if (r.status === 'exempt') exempt += 1;
    else pending += 1;
  }
  const total = rows.length;
  const resolved = complete + exempt;
  return {
    complete,
    exempt,
    pending,
    total,
    resolved,
    ratio: total === 0 ? 0 : resolved / total,
  };
}

/** True when nobody is left pending — drives the isometric empty state. */
export function isComplete(rows: readonly ComplianceRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.status !== 'pending');
}

/** Only the members still pending, name-sorted — the actionable "Mark paid" list. */
export function pendingRows(rows: readonly ComplianceRow[]): ComplianceRow[] {
  return rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.memberName.localeCompare(b.memberName));
}

/** One location's slice of a cross-location campaign, for the coordinator roll-up. */
export interface LocationRollup {
  locationName: string;
  progress: CampaignProgress;
}

/**
 * Group rows by location and compute each location's progress — the coordinator's
 * cross-location view (§5 "coordinator cross-location roll-up"). Rows with no
 * location fall under "Unassigned" so nobody is silently dropped. Location groups
 * are returned name-sorted.
 */
export function rollupByLocation(rows: readonly ComplianceRow[]): LocationRollup[] {
  const byLocation = new Map<string, ComplianceRow[]>();
  for (const r of rows) {
    const name = r.locationName?.trim() || 'Unassigned';
    const list = byLocation.get(name);
    if (list) list.push(r);
    else byLocation.set(name, [r]);
  }
  return [...byLocation.entries()]
    .map(([locationName, group]) => ({ locationName, progress: campaignProgress(group) }))
    .sort((a, b) => a.locationName.localeCompare(b.locationName));
}
