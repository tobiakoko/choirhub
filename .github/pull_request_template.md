<!--
Structured self-review. You're the only reviewer, so this checklist IS the
review. Delete sections that genuinely don't apply; don't delete them to avoid
thinking about them. See docs/devops.md §1.
-->

## What & why

<!-- One or two sentences. What changes for a chorister or leader, and why. -->

## How to verify

<!-- The steps you ran on your own phone / local stack. "Ran on my device" is
     the staging environment — there is no QA team. -->

-

---

## Self-review checklist

### Design system (CLAUDE.md rule 1)
- [ ] No magic values — every color, radius, spacing, font size comes from
      `packages/ui/src/tokens.ts`. New value? The token was added first.

### RLS & data (CLAUDE.md rule 2)
- [ ] New/changed table has RLS enabled **and** a pgTAP test (allow **and**
      deny cases) in the same migration PR.
- [ ] Migration is append-only — no edits to an already-applied migration.
- [ ] No service-role key anywhere in app code or CI.
- [ ] `npm run test:rls` passes locally.

### Offline (CLAUDE.md rule 3)
- [ ] Every read renders from WatermelonDB; no screen hard-requires network
      (except Zoom join).
- [ ] Every light write (ack, RSVP, form, mark-paid) goes through the outbox
      with a client UUID, and has a test.

### Accessibility (CLAUDE.md rule 4)
- [ ] 48px touch targets, `accessibilityLabel` on every control,
      `allowFontScaling` on.
- [ ] Critical text (times/dates/uniform) uses `<CriticalText>` and never
      truncates.

### Performance (CLAUDE.md rule 7)
- [ ] JS bundle stays within budget (CI `bundle-budget` is green).
- [ ] No new dependency >50KB without justification here.

### Security
- [ ] No secrets committed; `.env*` still gitignored.
- [ ] No real phone numbers / member names in fixtures or seed — use `+1555…`.

### Native vs OTA (docs/devops.md §4)
- [ ] If this touches `app.json`/`app.config.*`, `package.json`, `eas.json`, or
      `android/`/`ios/`, I understand it needs a **store build**, not an OTA
      update, and the sync API contract is unchanged (or versioned N-1).

## Rollback plan

<!-- If this breaks on Sunday morning: is it JS (eas update:rollback), backend
     (Supabase logs; app still reads from cache), or native (cannot fix today)?
     See docs/devops.md §8. -->

-
