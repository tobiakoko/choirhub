// Shared notification types used across the pure policy and the platform glue.

import type { Category } from '@choirhub/ui';

export type PushPlatform = 'ios' | 'android' | 'web';

export type NotificationLanguage = 'en' | 'fr' | 'yo';

/**
 * Member notification preferences — mirrors public.notification_prefs (0014). Held
 * locally so every settings read renders offline (rule #3); changes write through
 * to the server so the digest/escalation crons see them.
 */
export interface NotificationPrefs {
  mutedCategories: Category[];
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  digestHour: number;
  dataSaver: boolean;
  language: NotificationLanguage;
  timezone: string;
}

export const DEFAULT_DIGEST_HOUR = 20;

export function defaultPrefs(): NotificationPrefs {
  return {
    mutedCategories: [],
    quietHoursStart: null,
    quietHoursEnd: null,
    digestHour: DEFAULT_DIGEST_HOUR,
    dataSaver: false,
    language: 'en',
    // Resolve the device's IANA zone so the server digest fires at the member's
    // local hour; fall back to UTC where the runtime doesn't expose it.
    timezone: resolveTimezone(),
  };
}

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
