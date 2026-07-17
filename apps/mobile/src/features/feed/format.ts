// Small pure formatters for the feed header and cards. Kept dependency-free (no
// moment/lodash — performance budget §7) and unit-tested.

/**
 * Compact relative time, e.g. "just now", "5m ago", "2h ago", "3d ago". Falls
 * back to a short absolute date past a week so timestamps never grow unbounded.
 * `now` is injectable for deterministic tests.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = now.getTime() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * "⟳ Last updated 2h ago" copy for the sync-status pill (§6.1). Returns the
 * never-synced state when there is no timestamp yet.
 */
export function lastUpdatedLabel(lastSyncedAt: string | null, now: Date = new Date()): string {
  if (!lastSyncedAt) return 'Not synced yet';
  return `Last updated ${timeAgo(lastSyncedAt, now)}`;
}

/** Time-of-day greeting for the personalized header. `hour` is 0–23. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** First name only — the header stays warm without wrapping on long full names. */
export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}
