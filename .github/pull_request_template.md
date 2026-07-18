<!--
Keep this honest, not ceremonial. Delete sections that genuinely don't apply.
If a box is unchecked, say why in one line — an unchecked box with a reason
is useful information; a checked box that's a lie is a future outage.
-->

## What & why

<!-- One paragraph. What changes, and what problem it solves. Link the issue. -->

Closes #

## Type

- [ ] `feat` — new capability
- [ ] `fix` — bug fix
- [ ] `chore` / `refactor` / `docs` / `test`
- [ ] **Schema change** (migration included)
- [ ] **Native change** (new native module, config plugin, permissions — ⚠️ cannot ship via OTA, needs a store build)

## Spec conformance

- [ ] Follows `docs/choirhub-system-design-v2.md` — no undocumented architecture drift
- [ ] Follows `docs/design-system-v1.md` — **no magic values**; every color/spacing/radius/type comes from `packages/ui/src/tokens.ts`
- [ ] New/changed UI has 48×48 minimum touch targets and `accessibilityLabel`s
- [ ] Critical text (times, dates, uniform directives) uses `<CriticalText>` and cannot truncate

## The four risk areas

**Permissions (RLS)** — *if this PR touches `supabase/`, this is not optional*
- [ ] Every new table has RLS enabled and policies in the same migration
- [ ] pgTAP tests prove both the allow **and** the deny case (`npm run test:rls`)
- [ ] No permission logic lives only in the client
- [ ] No service-role key used in app code
- [ ] Migration is **new** — no edits to an already-applied migration

**Offline / sync**
- [ ] All reads render from WatermelonDB (works in airplane mode)
- [ ] Writes go through the outbox with a client-generated UUID (idempotent)
- [ ] Tested: queue action offline → relaunch app → reconnect → lands server-side exactly once

**Performance**
- [ ] No new dependency >50KB without justification below
- [ ] Feed/list changes profiled with CPU throttling — no dropped-frame warnings
- [ ] Sync payload stays text-only (no media in the delta)

**Security & privacy**
- [ ] No secrets, tokens, real phone numbers, or member names in code, tests, fixtures, or screenshots
- [ ] `.env` untouched; new config documented in `.env.example`

<!-- Dependency justification (if any): -->

## How I tested

<!-- Be specific. "Ran the app" is not a test note. -->
- [ ] `npm run typecheck && npm run lint && npm test` green locally
- [ ] Manual pass on a **low-end Android** (or throttled emulator)
- [ ] Manual pass with **200% font scale**
- [ ] Manual pass in **airplane mode**

Device(s) tested:

## Screenshots / screen recording

<!-- Required for any UI change. Before/after if modifying existing UI.
     Scrub any real member data first. -->

## Rollback plan

<!-- How do we undo this if it breaks on Sunday morning?
     JS-only → `eas update` to previous. Schema → forward-fix migration
     (Postgres migrations don't roll back cleanly — say what the fix-forward is). -->

## Notes for review

<!-- Anything you're unsure about, deliberately deferred, or want a second
     opinion on. Flag it here rather than hoping it gets caught. -->
