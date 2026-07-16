# ChoirHub Mobile — System Design & Architecture
**Version 2.0 · July 2026 · aligned to Design System v1.0.0 ("Trustworthy Yet Vibrant")**
Supersedes: `dlbc-choir-app-design.md` v1.0 (UI sections) · Incorporates: ADR-001 stack decision

---

## 1. Product Definition

ChoirHub is an **offline-first, broadcast-first** mobile app for DLBC regional choirs. It replaces WhatsApp logistics threads with a structured command center: targeted announcements with acknowledgment, a rehearsal schedule with RSVP, an offline song library (lyrics, tonic solfa, per-part audio), forms, and payment-compliance tracking for leaders — all governed by scoped roles and designed for a multigenerational audience (youth → seniors) on devices ranging from new iPhones to 1–2GB-RAM Androids on 2G/3G in Nigeria.

**Design pillars (from v1.0.0):** Trustworthy Yet Vibrant · Dimensional Depth · Refined Elegance · Professional Polish. 90% of every screen is slate/white/obsidian structure; the remaining 10% is Indigo→Violet and Cyan→Blue gradients reserved exclusively for primary actions.

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     MOBILE CLIENT — React Native (Expo)            │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  DESIGN SYSTEM PACKAGE (@choirhub/ui)                        │  │
│  │  tokens.ts (1:1 with v1.0.0 YAML) · primitives (Card, Button,│  │
│  │  Badge, OfflinePill, BottomSheet) · motion profiles          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌───────────────┐  │
│  │ Feature    │ │ State      │ │ Local DB    │ │ Sync Engine   │  │
│  │ modules:   │ │ Zustand +  │ │ WatermelonDB│ │ delta pull /  │  │
│  │ feed,      │ │ TanStack   │ │ (SQLite)    │ │ idempotent    │  │
│  │ schedule,  │ │ Query      │ │             │ │ outbox push   │  │
│  │ songs,     │ └────────────┘ └─────────────┘ └───────────────┘  │
│  │ leader     │ ┌────────────────────┐ ┌────────────────────────┐ │
│  └────────────┘ │ Media Cache Manager│ │ Reanimated 3 motion    │ │
│                 │ (tiered renditions,│ │ (spring-stiff FAB,     │ │
│                 │ Wi-Fi prefetch)    │ │ spring-fluid sheets)   │ │
│                 └────────────────────┘ └────────────────────────┘ │
└───────────────────────────┬────────────────────────────────────────┘
                            │ HTTPS + WebSocket
┌───────────────────────────┴────────────────────────────────────────┐
│                        SUPABASE (managed)                           │
│  Postgres + RLS (permissions) · Auth (phone OTP + invite codes)     │
│  Realtime (live feed) · Storage (originals) · Edge Functions        │
│  (sync endpoint, notification fan-out, transcode trigger, SMS)      │
│  pg_cron (digests, deadline escalation, archival)                   │
└───────┬──────────────────┬──────────────────────┬──────────────────┘
        │                  │                      │
  ┌─────┴─────┐     ┌──────┴───────┐      ┌───────┴────────┐
  │ FCM/APNs  │     │ Twilio/Termii│      │ Cloudflare R2  │
  │ push      │     │ SMS fallback │      │ + CDN: media   │
  │           │     │ (Critical)   │      │ renditions     │
  └───────────┘     └──────────────┘      └────────────────┘
```

Stack rationale is documented in ADR-001; summary: Expo/RN chosen for free OTA (EAS Update), native accessibility, and JS successor pool; Supabase chosen because Postgres RLS enforces the entire permission model in the database with an open-source exit path.

---

## 3. Client Architecture

### 3.1 Module structure

```
apps/mobile/
  src/
    ui/               ← design system: tokens.ts, Text, Card, GradientButton,
                        GhostButton, VocalBadge, OfflinePill, Stripe,
                        BottomSheet (gorhom), FAB, IsoEmptyState
    features/
      feed/           ← AnnouncementCard, filters, ack mutation
      schedule/       ← agenda list, month strips, RSVP
      songs/          ← RepertoireCard, AudioPlayer, LyricsSheet (bottom sheet)
      forms/          ← schema-driven renderer, offline submission
      leader/         ← ComposeSheet, ComplianceDashboard, members, invites
      onboarding/     ← phone OTP, invite code, voice part, pending approval
    data/
      models/         ← WatermelonDB models (mirrors server schema)
      sync/           ← pull/push protocol, outbox, conflict policy
      media/          ← rendition selection, download queue, LRU cache
      notifications/  ← channel setup, deep-link routing
```

### 3.2 Design-token pipeline

The v1.0.0 YAML is the **single source of truth**, committed as `tokens.ts`. No component may use a raw hex/px value — lint rule enforced (`no-magic-tokens`). Gradients are rendered with `expo-linear-gradient` at 135°; tinted shadows use the `shadow-tint-primary` rgba on iOS and a matched `elevation` + `shadowColor` on Android.

### 3.3 Typography strategy — Plus Jakarta Sans

The spec mandates Plus Jakarta Sans. To keep the low-bandwidth promise:
- **Bundled at build time** via `expo-font` (Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800 ≈ 350KB total inside the binary) — zero runtime download, works fully offline from first launch.
- `allowFontScaling` stays **on** everywhere; layouts flex to 200% Dynamic Type. Critical strings (times, dates, uniform directives) are never ellipsized — enforced by a shared `<CriticalText>` primitive that forbids `numberOfLines`.
- The lyrics/solfa block gets its own in-sheet scale slider (spec requirement), independent of OS scaling.

### 3.4 Motion system (Reanimated 3)

| Profile | Physics | Applied to |
|---|---|---|
| `spring-stiff` | stiffness 320, damping 24 | FAB press (scale → 0.9 → back), button taps, chip selection |
| `spring-fluid` | stiffness 180, damping 22 | Bottom sheets (lyrics, compose), card expansion |
| `glide-out` | layout animation, 240ms ease-out | Compliance row leaving the Pending list when marked Paid |
| `reduced-motion` | all springs → 120ms fades | Honors OS Reduce Motion setting |

All state changes animate; nothing "instantly cuts" (spec: Motion over Mutability).

### 3.5 Navigation & the bottom-sheet-first pattern

Four tabs (Home · Schedule · Songs · More) via `expo-router`. Per spec, **lyrics, solfa, and form-filling never push a new screen** — they open a `@gorhom/bottom-sheet` at elevation Level 4 (reversed upward shadow), preserving spatial context. The drag handle + darkened backdrop (`rgba(15,23,42,0.4)`) are standard. Leader compose is also a bottom sheet. Full-screen pushes are reserved for the song detail player and compliance dashboard.

---

## 4. Data Model (server, Postgres)

Unchanged from v1 architecture; key tables:

```
regions · locations · groups(type: committee|sub_choir|voice_part)
profiles(location_id, voice_part, locale, data_saver, notif_prefs)
roles(profile_id, role, scope_type, scope_id)        -- always scoped
announcements(category, priority, pinned, requires_ack, publish_at, expires_at)
audiences(target_type: all|region|location|group|voice_part, target_id)
acknowledgments · read_receipts
events(starts_at, uniform_directive, meeting_url, recurrence_rule) · rsvps
songs · song_assets(asset_type: lyrics|solfa|score_pdf|part_audio, voice_part,
                    renditions jsonb)
forms(fields jsonb, deadline) · form_responses
campaigns(type: payment|task, amount_cents, deadline)
campaign_status(status: pending|complete|exempt, marked_by)
-- all tables: updated_at + deleted_at for delta sync
```

**Category → color mapping (v1.0.0 semantic palette):**
Rehearsal `#7c3aed` violet · Payment `#10b981` emerald · Uniform `#06b6d4` cyan · Forms `#0ea5e9` sky · Logistics `#f59e0b` amber · Devotional `#4f46e5` indigo · Critical overrides stripe to `#e11d48` rose.

---

## 5. Permissions (enforced in Postgres RLS)

| Capability | Member | Committee Lead | Location Leader | Regional Coord. |
|---|:-:|:-:|:-:|:-:|
| Read targeted content / ack / RSVP / forms | ✅ | ✅ | ✅ | ✅ |
| Post to own committee | — | ✅ | — | ✅ |
| Post to own location | — | — | ✅ | ✅ |
| Post region-wide | — | — | — | ✅ |
| Critical priority (SMS fallback) | — | — | ✅ scope | ✅ |
| Compliance dashboard / mark paid | — | own campaign | own location | roll-up |
| Approve joins / invite codes | — | — | ✅ | ✅ |

RLS policies check `audiences` rows against the caller's region/location/voice-part/group memberships for reads, and `author_can_target()` for writes — the compose UI only *offers* scopes the role holds, so users never hit permission errors. A compromised member account can post nothing; a compromised leader account is contained to one location.

**Onboarding:** phone OTP → location-scoped invite code (expiring, revocable, QR) → voice-part selection → leader approval → automatic backfill of pinned/evergreen content. The pending-approval screen includes the mandated human fallback: **Call your location leader**.

---

## 6. Offline-First & Low-Bandwidth Engine

### 6.1 Sync protocol
- **Pull:** on launch/foreground/push/reconnect, `GET /sync?since=<last_pulled_at>` returns a gzipped JSON delta of text-only rows (announcements, events, song text, statuses) — typically 5–50KB; a week of content syncs over 2G in seconds.
- **Push:** acks, RSVPs, form responses, "mark paid" queue in a local **outbox** with client-generated UUIDs (idempotent); last-write-wins on the rare conflict.
- **UI contract:** offline is a viewing mode, not an error. Stale data shows the `pill-offline` token (`⟳ Last updated 2h ago`); queued actions show success immediately with a 🕓 clock (spec-compliant), and auto-clear on reconnect.

### 6.2 Media pipeline
Edge function transcodes uploads into renditions stored on R2/CDN:

| Asset | Renditions | Default fetch |
|---|---|---|
| Image | 30KB WebP thumb · 120KB low · full | thumb inline; HD on explicit tap |
| Part audio | **Opus 24kbps mono (~0.7MB / 4min)** · AAC 96k | Opus on cellular, AAC on Wi-Fi |
| Docs | first-page preview + PDF | preview inline |

- **Rehearsal-pack prefetch:** night before an event, on Wi-Fi + charging, the app silently downloads that event's songs **for the member's own voice part only**.
- **Data Saver** (auto-suggested on low-end/slow network): thumbs only, Opus everywhere, downloads deferred to Wi-Fi. Every download states its size (spec Do).
- Resumable range requests; LRU eviction never touches lyrics/solfa text.

### 6.3 Notifications
| Priority | Delivery |
|---|---|
| Critical | High-importance push; if unread ~4h before a deadline → **SMS fallback** (Twilio; Termii for +234 corridor) |
| Important | Standard push |
| Normal | Silent; folded into one **daily digest** push (pg_cron) at the user's chosen hour |

Deadline escalation re-notifies **only members still pending** at T-72h/T-24h — automating the manual chasing observed in the WhatsApp history.

---

## 7. Performance Budget (low-end Android floor: 1.5GB RAM, Android 10)

| Metric | Budget | Levers |
|---|---|---|
| Cold start → interactive | ≤ 2.5s | Hermes bytecode, lazy feature modules, no blocking font fetch (bundled) |
| Feed scroll | 60fps, <2% dropped | FlatList virtualization, memoized cards, thumb-only images |
| JS bundle | ≤ 4MB | expo-router code splitting, no moment/lodash-full |
| First sync payload | ≤ 50KB gz | text-only delta |
| Gradient/shadow cost | — | gradients only on ≤10% of surfaces per spec; Android uses `elevation` not layered shadows |

---

## 8. Security, Privacy, Ops

- Identity = phone OTP; no passwords. All role grants audited. Invite codes expire/revoke.
- RLS is the single enforcement point; the client is untrusted. Storage buckets use signed URLs scoped by the same audience rules.
- Backups: Supabase PITR (Pro); weekly logical dump to R2.
- Crash/telemetry: Sentry free tier. Release: EAS Build; **fixes ship via EAS Update OTA** (JS-level) without store review.
- Cost envelope at ~250 members: $0–30/mo infra + SMS ($5–15) + Apple $99/yr.

## 9. Delivery Phases

| Phase | Scope | Exit signal |
|---|---|---|
| MVP (8–10w) | Onboarding, feed + targeting + ack, schedule + RSVP + reminders, offline read cache, push, design system package | One location live; "resend the link" → ~0 |
| P2 | Song library + renditions + prefetch, bottom-sheet lyrics w/ scale slider, forms, Data Saver | Members rehearse from the app |
| P3 | Campaigns + compliance dashboard + auto-reminders + SMS fallback | Leaders stop manual chasing |
| P4 | Multi-region, FR/Yorùbá localization, directory, isometric analytics, web read-only companion | Second region onboards |
