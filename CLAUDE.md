# CLAUDE.md — ChoirHub

## What this project is
Offline-first mobile app for DLBC regional choirs: targeted announcements with
acknowledgment, rehearsal schedule with RSVP, offline song library (lyrics,
tonic solfa, per-voice-part audio), forms, and payment-compliance tracking for
leaders. Users range from teenagers to seniors, on devices from new iPhones to
1.5GB-RAM Androids on 2G/3G (US + Nigeria).

**Authoritative specs (read before planning any feature):**
- `docs/choirhub-system-design-v2.md` — architecture, data model, RLS permission
  model, sync protocol, media pipeline, performance budget
- Design System v1.0.0 tokens live in `packages/ui/src/tokens.ts` — the single
  source of truth for all visual values

## Stack
- **App:** Expo (React Native) + TypeScript strict, expo-router, Zustand +
  TanStack Query, Reanimated 3, @gorhom/bottom-sheet, expo-linear-gradient
- **Local data:** WatermelonDB (SQLite) with delta pull / idempotent outbox push
- **Backend:** Supabase — Postgres + RLS, Auth (phone OTP), Storage, Edge
  Functions (Deno), pg_cron. Migrations in `supabase/migrations/` only.
- **Media:** renditions on Cloudflare R2 (Opus 24k audio, WebP thumbs)
- **Fonts:** Plus Jakarta Sans bundled via expo-font — never fetched at runtime

## Repo layout
```
apps/mobile/          Expo app (features/, data/, app/ routes)
packages/ui/          design system: tokens.ts + primitives (no app imports)
supabase/             migrations/, functions/, seed.sql
docs/                 system design, ADRs, this build plan
```

## Commands
- `npm run dev` — Expo dev server ·  `npm run typecheck` — tsc --noEmit
- `npm run lint` — eslint ·  `npm test` — jest
- `npx supabase db reset` — rebuild local DB from migrations + seed
- `npm run test:rls` — RLS policy tests (pgTAP) — must pass before any schema PR

## Non-negotiable rules
1. **No magic values.** Every color, radius, spacing, font size comes from
   `packages/ui/src/tokens.ts`. If a value isn't a token, add the token first.
2. **RLS is the security boundary.** Never enforce permissions only in the
   client. Every new table gets RLS policies + a pgTAP test in the same
   migration PR. Never use the service-role key in app code.
3. **Offline is a mode, not an error.** Every read renders from WatermelonDB.
   Every light write (ack, RSVP, form, mark-paid) goes through the outbox with
   a client UUID. No screen may hard-require network except Zoom join.
4. **Accessibility floor:** 48px touch targets, accessibilityLabel on every
   control, allowFontScaling on, critical text (times/dates/uniform) never
   truncates — use `<CriticalText>`.
5. **Never commit secrets.** `.env*` is gitignored; use `.env.example`.
   Supabase keys via expo-constants only. Do not read or print `.env` contents.
6. **Migrations are append-only.** Never edit an applied migration; create a
   new one.
7. **Performance budget:** cold start ≤2.5s on low-end Android, feed 60fps,
   first sync payload ≤50KB gz. Justify any new dependency >50KB.

## Conventions
- TypeScript strict; no `any` without a `// why:` comment
- Feature-folder structure (`features/feed`, `features/songs`…); shared
  primitives only in `packages/ui`
- Cross-feature imports use deep paths (`@/features/feed/useViewer`), not the
  feature barrel, so two features that reference each other don't form an
  index↔index import cycle (e.g. feed's FAB slot ↔ leader compose).
- Components: function declarations, props typed inline or `XProps`
- Commits: conventional (`feat:`, `fix:`, `chore:`) — one logical change per
  commit; commit at every green checkpoint
- Tests colocated `*.test.ts(x)`; every sync/outbox change needs a test
- Copy style: sentence case, plain verbs, no jargon ("Fill form", not "Submit")

## Working agreement for Claude
- Non-trivial or multi-file work: start in plan mode; name affected files,
  risks, and verification steps before editing.
- **If execution diverges from the approved plan, stop and return to plan
  mode — do not improvise.**
- After implementing: run `npm run typecheck && npm run lint && npm test` and
  fix failures before declaring done.
- When you learn a project-specific gotcha, propose a one-line addition to
  this file rather than repeating the mistake.
