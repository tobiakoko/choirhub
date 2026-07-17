// Pure formatting for the settings screens — kept out of the components so the
// hour clock and category labels are unit-tested and reused across screens.

import type { Category } from '@choirhub/ui';

/** A 24h hour [0,23] as a friendly clock, e.g. 0 → "12 AM", 13 → "1 PM". */
export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const period = normalized < 12 ? 'AM' : 'PM';
  const twelve = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${twelve} ${period}`;
}

/** Wrap an hour by ±1 within [0,23] for the steppers. */
export function stepHour(hour: number, delta: number): number {
  return (((hour + delta) % 24) + 24) % 24;
}

/** Announcement categories a member can mute (Critical is never mutable — §6.3). */
export const MUTABLE_CATEGORIES: readonly Category[] = [
  'rehearsal',
  'payment',
  'uniform',
  'forms',
  'logistics',
  'devotional',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  rehearsal: 'Rehearsals',
  payment: 'Payments',
  uniform: 'Uniform',
  forms: 'Forms',
  logistics: 'Logistics',
  devotional: 'Devotional',
  critical: 'Critical',
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  yo: 'Yorùbá',
};
