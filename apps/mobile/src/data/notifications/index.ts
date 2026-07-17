// Public surface of the notification pipeline (§6.3). Pure policy/digest/escalation
// modules are exported for reuse + tests; the platform glue (channels, token
// registration, prefs store, hooks) wires them to expo-notifications and Supabase.

export {
  deliveryForPriority,
  androidChannelForPriority,
  isWithinQuietHours,
  decideDelivery,
  smsProviderForPhone,
  type Priority,
  type AndroidChannelId,
  type Delivery,
  type QuietHours,
  type DeliveryContext,
  type DeliveryDecision,
  type SmsProvider,
} from './policy';
export { dueEscalations, ESCALATION_OFFSETS, type EscalationTier } from './escalation';
export { buildDigest, DIGEST_PREVIEW_LIMIT, type DigestItem, type DigestMessage } from './digest';
export {
  parseNotificationTarget,
  routeForTarget,
  routeForNotification,
  type NotificationTarget,
} from './deepLink';

export { ensureAndroidChannels } from './channels';
export { registerPushToken, deactivatePushToken, getInstallId, type RegisterResult } from './register';
export { rowToPrefs, prefsToRow, type NotificationPrefsRow } from './prefsMapping';
export { useNotificationPrefsStore } from './prefsStore';
export { useNotifications, useNotificationPrefs } from './useNotifications';
export {
  defaultPrefs,
  DEFAULT_DIGEST_HOUR,
  type NotificationPrefs,
  type NotificationLanguage,
  type PushPlatform,
} from './types';
