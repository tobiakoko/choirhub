# ChoirHub

Offline-first mobile app for DLBC regional choirs: targeted announcements with
acknowledgment, rehearsal schedule with RSVP, offline song library, forms, and
payment-compliance tracking for leaders.

See `CLAUDE.md` for working rules and `docs/choirhub-system-design-v2.md` for
the authoritative system design.

## Repo layout

```
apps/mobile/          Expo app (features/, data/, app/ routes)
packages/ui/          design system: tokens.ts + primitives (no app imports)
supabase/             migrations/, functions/, seed.sql
docs/                 system design, ADRs, build plan
```

## Getting started

```sh
npm install
cp .env.example .env   # fill in Supabase project values
npm run dev            # Expo dev server
```

## Scripts

- `npm run dev` — Expo dev server
- `npm run typecheck` — TypeScript (all workspaces)
- `npm run lint` — ESLint (includes the `no-magic-tokens` design-system rule)
- `npm test` — Jest (jest-expo)
- `npx supabase db reset` — rebuild local DB from migrations + seed
