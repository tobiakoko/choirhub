// Human-facing size + time formatting for the player. The design system mandates
// stating every download's size explicitly (§6.2 "Every download states its size"),
// so the card always shows a concrete figure, never a spinner-only affordance.

/**
 * Compact byte size for the card/badge, e.g. `0.7 MB`, `96 KB`, `812 B`.
 * MB keeps one decimal (the spec's "0.7MB" shorthand); KB rounds to whole.
 */
export function formatBytes(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `m:ss` clock for a millisecond position/duration; clamps negatives to 0:00. */
export function formatClock(ms: number | undefined): string {
  const total = ms == null || !Number.isFinite(ms) || ms < 0 ? 0 : Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
