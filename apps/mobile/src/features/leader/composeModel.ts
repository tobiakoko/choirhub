// The compose wizard's pure view-model (§ leader UI: Write → Audience → Delivery
// → Preview → publish). All state transitions and validation live here as pure
// functions so the ComposeSheet stays presentational and every rule is unit-
// tested. The sheet holds a single ComposeState and calls into these to advance,
// validate, and finally produce the publish input the data layer sends.

import type { PostableScope } from './postableScopes';
import { scopeKey } from './postableScopes';

// ── categories (server enum public.announcement_category — no 'critical') ─────
// 'critical' is a *priority*, not a category; it never appears here.
export type AnnouncementCategory =
  | 'rehearsal'
  | 'payment'
  | 'uniform'
  | 'forms'
  | 'logistics'
  | 'devotional';

export const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'payment', label: 'Payment' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'forms', label: 'Forms' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'devotional', label: 'Devotional' },
];

// ── delivery tiers (§6.3 notifications) ──────────────────────────────────────
export type DeliveryTier = 'normal' | 'important' | 'critical';

/** UI copy for each tier, including the SMS-fallback note the spec mandates. */
export const DELIVERY_TIERS: {
  value: DeliveryTier;
  label: string;
  description: string;
}[] = [
  { value: 'normal', label: 'Normal', description: 'Silent — folded into the daily digest.' },
  { value: 'important', label: 'Important', description: 'A standard push notification.' },
  {
    value: 'critical',
    label: 'Critical',
    description: 'High-priority push, and an SMS to anyone who has not read it before the deadline.',
  },
];

// ── steps ─────────────────────────────────────────────────────────────────────
export type ComposeStep = 'write' | 'audience' | 'delivery' | 'preview';
export const COMPOSE_STEPS: readonly ComposeStep[] = ['write', 'audience', 'delivery', 'preview'];

export function stepIndex(step: ComposeStep): number {
  return COMPOSE_STEPS.indexOf(step);
}
export function isLastStep(step: ComposeStep): boolean {
  return stepIndex(step) === COMPOSE_STEPS.length - 1;
}
export function nextStep(step: ComposeStep): ComposeStep {
  return COMPOSE_STEPS[Math.min(stepIndex(step) + 1, COMPOSE_STEPS.length - 1)];
}
export function prevStep(step: ComposeStep): ComposeStep {
  return COMPOSE_STEPS[Math.max(stepIndex(step) - 1, 0)];
}

// ── attachments (metadata only; upload happens in the data layer) ────────────
export interface ComposeAttachment {
  /** Client id so React keys stay stable and removal is O(1). */
  id: string;
  name: string;
  uri: string;
  /** Bytes, so the UI can state each attachment's size (spec Do). */
  sizeBytes: number;
}

// ── the wizard's state ────────────────────────────────────────────────────────
export interface ComposeState {
  title: string;
  body: string;
  category: AnnouncementCategory;
  attachments: ComposeAttachment[];
  /** scopeKey() values the author selected in the Audience step. */
  selectedScopeKeys: string[];
  tier: DeliveryTier;
  requireAck: boolean;
  pin: boolean;
  /** ISO time to schedule at, or null to publish immediately. */
  scheduleAt: string | null;
}

export function initialComposeState(): ComposeState {
  return {
    title: '',
    body: '',
    category: 'logistics',
    attachments: [],
    selectedScopeKeys: [],
    tier: 'normal',
    requireAck: false,
    pin: false,
    scheduleAt: null,
  };
}

/** Toggle a scope's membership in the selection (immutably). */
export function toggleScope(state: ComposeState, scope: PostableScope): ComposeState {
  const key = scopeKey(scope);
  const has = state.selectedScopeKeys.includes(key);
  return {
    ...state,
    selectedScopeKeys: has
      ? state.selectedScopeKeys.filter((k) => k !== key)
      : [...state.selectedScopeKeys, key],
  };
}

/** The scopes the author actually selected, resolved against the offered list. */
export function selectedScopes(
  state: ComposeState,
  offered: readonly PostableScope[]
): PostableScope[] {
  const set = new Set(state.selectedScopeKeys);
  return offered.filter((s) => set.has(scopeKey(s)));
}

// ── validation / advancement ──────────────────────────────────────────────────
/** Whether the given step is complete enough to advance to the next one. */
export function canAdvance(step: ComposeStep, state: ComposeState): boolean {
  switch (step) {
    case 'write':
      return state.title.trim().length > 0 && state.body.trim().length > 0;
    case 'audience':
      return state.selectedScopeKeys.length > 0;
    case 'delivery':
    case 'preview':
      return true;
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}

/** True only when every step's requirements are met — gates the publish button. */
export function canPublish(state: ComposeState): boolean {
  return canAdvance('write', state) && canAdvance('audience', state);
}

const TIER_TO_PRIORITY: Record<DeliveryTier, 'normal' | 'important' | 'critical'> = {
  normal: 'normal',
  important: 'important',
  critical: 'critical',
};

/** The announcement + audience rows the publish hook writes. Mirrors the server
 *  tables 1:1; the Preview step renders from the same shape. */
export interface PublishInput {
  announcement: {
    category: AnnouncementCategory;
    priority: 'normal' | 'important' | 'critical';
    pinned: boolean;
    requires_ack: boolean;
    title: string;
    body: string;
    publish_at: string;
  };
  audiences: { target_type: PostableScope['targetType']; target_id: string | null }[];
}

/**
 * Freeze the wizard into the exact rows to publish. Trims text, maps the delivery
 * tier to the server priority, resolves the schedule (now when unset), and emits
 * one audience row per selected scope. Throws if called on an invalid state — the
 * UI gates this behind canPublish, and the server re-checks every audience anyway.
 */
export function toPublishInput(
  state: ComposeState,
  offered: readonly PostableScope[],
  now: Date = new Date()
): PublishInput {
  if (!canPublish(state)) throw new Error('compose state is incomplete');
  const chosen = selectedScopes(state, offered);
  return {
    announcement: {
      category: state.category,
      priority: TIER_TO_PRIORITY[state.tier],
      pinned: state.pin,
      requires_ack: state.requireAck,
      title: state.title.trim(),
      body: state.body.trim(),
      publish_at: state.scheduleAt ?? now.toISOString(),
    },
    audiences: chosen.map((s) => ({ target_type: s.targetType, target_id: s.targetId })),
  };
}
