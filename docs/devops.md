# ChoirHub — DevOps Handbook

**Context that shapes every decision here:** one volunteer maintainer, a church
audience, and a Sunday-morning deadline that doesn't move. So the guiding rule
is **automate the things that catch mistakes, skip the ceremony that only
performs process.** Every check below exists because a specific failure would
hurt real people — a leader broadcasting to the wrong region, a member's phone
number in a public repo, a crash loop on 200 phones an hour before service.

---

## 1. What's in `.github/` and why

| File | Purpose | Failure it prevents |
|---|---|---|
| `pull_request_template.md` | Structured self-review | Shipping UI with magic values, or a schema change with no RLS test |
| `workflows/ci.yml` | typecheck · lint · test · expo-doctor · bundle budget | Type errors and 5MB bundles reaching main |
| `workflows/db.yml` | Migrations apply clean · **pgTAP RLS tests** · schema-drift check · RLS-enabled assertion | **A table shipped without RLS = world-readable via the anon key** |
| `workflows/security.yml` | gitleaks · npm audit · CodeQL · PII guard | A committed Supabase service-role key; real member phone numbers in fixtures |
| `workflows/deploy.yml` | OTA on JS changes · **blocks OTA on native changes** | Shipping a native change over-the-air → crash loop on every device |
| `dependabot.yml` | Grouped weekly updates | Silent CVEs; also, notification fatigue that makes you ignore all of them |
| `CODEOWNERS` | Marks high-stakes paths | Meaningless solo — becomes your safety net the day someone else contributes |
| `ISSUE_TEMPLATE/` | Captures role + network state + device | Unreproducible "the app is broken" reports |

### The three checks that actually matter

Everything else is hygiene. These three are load-bearing:

1. **`db.yml` → RLS tests.** Your entire permission model lives in Postgres
   (`system-design §5`). The client is untrusted by design. If these tests
   don't run, you're shipping a security model you haven't verified. The
   "assert RLS enabled on every public table" step is deliberately paranoid:
   forgetting `ENABLE ROW LEVEL SECURITY` on one table exposes it to anyone
   with the public anon key — the single most common Supabase breach.

2. **`security.yml` → gitleaks.** Scans full history, not just the diff. A
   service-role key in a public repo bypasses every policy you wrote. Note that
   rotating a leaked key is the *only* remedy — deleting the commit doesn't help
   once it's been pushed.

3. **`deploy.yml` → native-guard.** The Expo footgun: `eas update` ships JS
   instantly, but *cannot* deliver native changes (new modules, permissions,
   app config). Ship a native change as an OTA and every device downloads JS its
   binary can't run. The guard detects native-affecting file changes and refuses
   to publish, telling you to build instead.

---

## 2. Repo settings to configure by hand

Config files can't set these — do them once in the GitHub UI.

### Branch protection on `main` (Settings → Rules → Rulesets)

Even solo. Especially solo — there's nobody else to catch you.

- ✅ Require a pull request before merging
  - **Required approvals: 0** — you can't approve your own PR, and blocking
    yourself just teaches you to click "bypass." The PR still exists, still
    runs CI, still gives you a diff to read. That's the value.
- ✅ Require status checks to pass: `verify`, `expo-doctor`, `bundle-budget`,
  `migrations-and-rls`, `secrets`, `deps`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution
- ✅ **Block force pushes** and **restrict deletions** ← the one that saves you
- ✅ Require linear history (keeps `git bisect` usable when something breaks)

### Other settings

- **Actions → General:** "Read repository contents permission" as default token
  scope (workflows request more explicitly).
- **Code security:** enable Dependabot alerts, Dependabot security updates,
  secret scanning + **push protection** (rejects a key *before* it lands).
- **Merge button:** squash-only. One PR = one commit on main = one clean revert.
- **Auto-delete head branches:** on.

### Environments (Settings → Environments)

Create `preview` and `production`. Put `EXPO_TOKEN` in both, but add a
**required reviewer (yourself)** on `production` — a deliberate 10-second pause
before anything reaches real choristers on a Sunday.

---

## 3. Secrets

| Secret | Where | Notes |
|---|---|---|
| `EXPO_TOKEN` | Repo → environments | Robot account token from expo.dev, not your personal one |
| `SUPABASE_ACCESS_TOKEN` | Repo secret | Only if you automate remote migrations (see §5) |
| `SUPABASE_DB_PASSWORD` | Repo secret | Same |
| `GITLEAKS_LICENSE` | Repo secret | Only needed for orgs; personal repos are free |

**Never in the repo:** the Supabase **service-role key**. It has no place in
app code or CI. The mobile app uses only the anon key (safe by design — RLS
does the enforcement), and it ships via `app.config.ts` → `extra`, not a
committed `.env`.

**Rotation drill (do it once so you know the steps under pressure):** Supabase
dashboard → Settings → API → rotate keys → update EAS secrets → `eas update`.
Practice this now, not the day it leaks.

---

## 4. Branching & release strategy

Keep it boring — trunk-based with short-lived branches:

```
main ──●────●────●────●──────────────────►  always deployable
        \    \         \
      phase/  fix/      feat/
      1-design  ota-badge  compliance-dash
```

- Branch names match the playbook phases: `phase/2-schema`, `feat/song-player`,
  `fix/rsvp-timezone`.
- Conventional commits (`feat:`, `fix:`, `chore:`) — enables automated
  changelogs later, and makes `git log` readable at 11pm.
- Merge to `main` → OTA to `preview` channel automatically.
- Promote to `production` manually (`workflow_dispatch` → channel: production)
  **after** you've run it on your own phone. Your device is the staging
  environment; there is no QA team.

### Runtime versions — the subtle one

`eas update` only reaches binaries with a matching `runtimeVersion`. Use
`"runtimeVersion": { "policy": "appVersion" }` and understand the consequence:
members who haven't updated from the store keep receiving OTA updates for the
*old* runtime. **So never break the sync API contract in the same release as a
native change** — old binaries will still be calling it. Version the sync Edge
Function's response shape and support N-1.

---

## 5. Migrations: the one place to be conservative

Postgres migrations don't roll back cleanly. Treat them as one-way doors:

- **Append-only.** Never edit an applied migration (it's in `CLAUDE.md` for a
  reason). Fix forward with a new one.
- **Expand → migrate → contract** for anything destructive. Add the new column,
  backfill, ship code using it, *then* drop the old column in a later release.
  Never in one PR — old app binaries are still running the old shape.
- **Apply to production manually at first.** Automating `supabase db push` on
  merge is convenient right up until it drops a column on a Saturday night.
  Once you have >3 months of migration history and confidence, automate it
  behind a `production` environment gate.
- **Backups:** Supabase Pro gives PITR. On free tier, add a weekly
  `pg_dump` → R2 job. Test a restore once. An untested backup is a rumor.

---

## 6. Testing strategy (what to test, what to skip)

You don't have time for 90% coverage. Spend the budget where bugs are
expensive and invisible:

| Layer | Coverage target | Why |
|---|---|---|
| **RLS policies (pgTAP)** | 100% of policies, allow **and** deny | Silent, catastrophic, unnoticeable in the UI |
| **Sync engine / outbox (jest)** | High | Bugs here = lost acknowledgments = a leader chasing someone who already paid |
| **Pure logic** (timezone, recurrence, rendition selection, LRU) | High | Cheap to test, easy to get subtly wrong |
| **Components** | Smoke only | Render + a11y props present |
| **E2E (Maestro)** | 2 flows max | Onboarding, and offline-ack→reconnect→synced |

The deny-case test is the one people skip. `select` returning rows for the
right user proves nothing about security — you need the test asserting the
*wrong* user gets **zero** rows.

---

## 7. Observability

- **Sentry** (free tier) with `sentry-expo`: tag every event with `role`,
  `location`, `isOffline`, `updateId`. Without `updateId` you can't tell which
  OTA introduced a crash.
- **Release health:** watch crash-free sessions after each `eas update`. If it
  drops, `eas update:rollback` — seconds, not a store review.
- **Scrub PII** in `beforeSend`: no phone numbers, no member names.
- **Supabase logs** for Edge Function errors; alert on sync endpoint 5xx rate.

---

## 8. Sunday-morning incident runbook

The realistic emergency: something breaks before service.

1. **Is it JS?** → `eas update:rollback --branch production`. Members get the
   fix on next launch. ~2 minutes.
2. **Is it the backend?** → check Supabase logs; the app still works offline
   from cache, so this is rarely a true emergency. Members can still read
   tonight's uniform and their part audio.
3. **Is it native?** → you cannot fix this today. Communicate in WhatsApp (which
   still exists, on purpose, during rollout) and build a fix for the week.
4. **Afterwards:** write the failure into `CLAUDE.md` or a test. Every incident
   should leave behind something that prevents its own recurrence.

---

## 9. Cost control

GitHub Actions is free for public repos. If you go private:

- `concurrency` groups cancel superseded runs (already configured)
- `paths-filter` skips CI on doc-only changes (already configured)
- `timeout-minutes` on every job stops a hung run from burning 6 hours
  (already configured)
- Cache `npm ci` via `setup-node`'s built-in cache (already configured)

EAS Build free tier is limited; local builds (`eas build --local`) are
unlimited if you hit the cap.

---

## 10. Suggested order of adoption

Don't add all ten files on day one and drown. Sequence:

1. **Now:** `pull_request_template.md`, `ci.yml`, branch protection, secret
   scanning push protection. (Catches most mistakes, costs nothing.)
2. **With Session 2 (schema):** `db.yml`. This is the one that matters most —
   add it the same day you write your first migration.
3. **Before first real user:** `security.yml`, `dependabot.yml`.
4. **Before first OTA:** `deploy.yml` + environments + the rollback drill.
5. **When a second contributor appears:** `CODEOWNERS` teeth, required reviews.
