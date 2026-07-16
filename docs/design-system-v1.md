# ChoirHub Mobile — Design System
**Version:** 1.0.0
**Codename:** "Trustworthy Yet Vibrant"

## Overview

ChoirHub is an offline-first mobile application designed for the DLBC regional choirs. It abandons flat, legacy ecclesiastical aesthetics (heavy purples/golds) in favor of a modern, **"Trustworthy Yet Vibrant"** visual language. The system operates on a cool slate canvas, utilizing structural obsidian for high legibility, and reserves vibrant indigo and cyan gradients exclusively for primary interactions. Depth is functional, employing soft, tinted shadows to establish a Z-axis hierarchy for touch targets, while a strict 8-point geometric grid ensures professional, enterprise-grade polish.

The ChoirHub mobile application radically departs from the heavy, cluttered aesthetic of legacy church management tools. Built upon four core pillars — **Trustworthy Yet Vibrant, Dimensional Depth, Refined Elegance, and Professional Polish** — the interface is engineered to drastically reduce cognitive load for a diverse demographic (from youth to seniors).

The app operates on a clean, tech-forward canvas of cool slates (`canvas-base`) punctuated by highly controlled, luminous gradients (`gradient-action-primary`). Every interaction — from acknowledging a rehearsal to downloading a part-audio track — feels tactile and satisfying due to physics-based micro-interactions and soft, mathematically calculated shadows. By enforcing an uncompromising 8-point geometric grid and accessible typography, the app transforms chaotic WhatsApp logistical threads into a serene, enterprise-ready command center.

### Key characteristics

| Characteristic | What it means |
|---|---|
| **Vibrant Gradients, Monochromatic Structure** | 90% of the screen is white, slate, and obsidian text. The remaining 10% leverages high-energy Indigo-to-Violet and Cyan-to-Blue gradients to draw the eye immediately to primary actions (FABs, primary buttons). |
| **Tactile Z-Axis Mapping** | The UI actively uses elevation. Backgrounds are recessed, standard cards sit lightly at Level 2, active modals float at Level 4, and Floating Action Buttons cast massive, colored shadows at the absolute top of the Z-axis. |
| **Generous Proportions** | Minimum touch targets are strictly 48×48 points. Text sizes bottom out at a highly legible 12px, ensuring grandmothers can use the app without reading glasses. |
| **Motion over Mutability** | The app uses React Native Reanimated to ensure all state changes (e.g., expanding a card, sliding up a lyric sheet) are governed by physical spring mechanics, never harsh, instant cuts. |

---

## 1. Colors

### 1.1 Base & canvas

| Token | Value | Usage |
|---|---|---|
| `canvas-base` | `#f8fafc` (Slate 50) | The app's root background — lowest Z-index. Prevents the harsh eye strain of pure white during nighttime rehearsals while staying crisp and professional. |
| `canvas-elevated` | `#ffffff` | Pure white — used strictly for foreground cards, modals, and bottom sheets. Creates natural, effortless bounding boxes against the slate base. |
| `canvas-inset` | `#f1f5f9` (Slate 100) | For inactive/empty states. |

### 1.2 Structural text & ink

| Token | Value | Usage |
|---|---|---|
| `ink-primary` | `#0f172a` (Obsidian 900) | All primary titles, song names, crucial metadata. ~17:1 contrast on white. |
| `ink-secondary` | `#475569` (Obsidian 700) | Timestamps, subtitles ("Composer", "Location"), offline status indicators. |
| `ink-tertiary` | `#94a3b8` (Slate 400) | Disabled text, placeholders. |
| `on-color` | `#ffffff` | Text on gradient or solid vibrant backgrounds. |

### 1.3 Brand & interaction gradients

Flat brand colors are retired for primary calls to action. The system uses angled linear gradients to simulate volumetric lighting and inject energetic vibrancy into an otherwise clinical structure.

| Token | Value | Usage |
|---|---|---|
| `gradient-action-primary` | `linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)` — Indigo → Violet | Compose FAB, "Acknowledge" buttons, major confirmation actions |
| `gradient-action-secondary` | `linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)` — Cyan → Blue | Technical interactions: "Download Audio", "Sync", data-heavy dashboards |

### 1.4 Solid interactive

| Token | Value |
|---|---|
| `interactive-base` | `#4f46e5` (Electric Indigo) |
| `interactive-hover` | `#4338ca` (Indigo 700) |
| `interactive-ghost` | `rgba(79, 70, 229, 0.08)` |

### 1.5 Semantic & status

| Token | Value | Usage |
|---|---|---|
| `status-success` | `#10b981` (Emerald) | Replaces gold "paid" markers — acknowledged, RSVP "Yes", payment block cleared |
| `status-critical` | `#e11d48` (Rose) | Absolute emergencies only — cancelled rehearsals, highly overdue payments |
| `status-warning` | `#f59e0b` (Amber) | Pending tasks |
| `status-info` | `#0ea5e9` (Sky) | General info tags |

### 1.6 Borders & dividers

| Token | Value | Usage |
|---|---|---|
| `hairline` | `#e2e8f0` (Slate 200) | Subtle list dividers |
| `hairline-strong` | `#cbd5e1` (Slate 300) | Input borders |

### 1.7 Specialized shadows

| Token | Value |
|---|---|
| `shadow-tint-primary` | `rgba(79, 70, 229, 0.25)` |
| `shadow-tint-neutral` | `rgba(15, 23, 42, 0.08)` |

---

## 2. Typography

**Font family:** Plus Jakarta Sans — a modern, geometric sans-serif. Its tall x-height and open counters make it exceptionally readable on small, low-resolution mobile screens, balancing a premium, structural feel with approachable warmth.

### 2.1 Type scale

| Token | Size | Weight | Line height | Letter spacing | Case |
|---|---|---|---|---|---|
| `display-lg` | 32px | 800 | 38px | -0.02em | — |
| `heading-1` | 24px | 700 | 30px | -0.01em | — |
| `heading-2` | 20px | 600 | 28px | — | — |
| `body-lg` | 18px | 500 | 28px | — | — |
| `body-md` | 16px | 400 | 24px | — | — |
| `body-sm` | 14px | 500 | 20px | — | — |
| `caption` | 12px | 400 | 16px | 0.01em | — |
| `badge` | 10px | 800 | 12px | 0.05em | UPPERCASE |

All roles use `"Plus Jakarta Sans", system-ui, sans-serif`.

### 2.2 Hierarchy — where each role is used

| Role | Used for |
|---|---|
| `display-lg` (32px) | Major empty states or immersive welcome screens |
| `heading-1` (24px) | Top-level screen navigation titles ("Schedule", "Song Library") |
| `heading-2` (20px) | Primary card titles ("Regional Rehearsal", "Explosive Manifestation") |
| `body-lg` / `body-md` | The workhorses — announcement text, lyric bodies, standard lists |
| `badge` (10px, uppercase) | Vocal Parts (SOPRANO, ALTO, TENOR, BASS) and UI tags (NEW, PINNED) only |

### 2.3 Typography principles

- **No OS font overrides.** Respects Dynamic Type up to 200%. Layouts must flex; critical info (times, dates) must never truncate with `…`.
- **Lyrics & Solfa** render as text (not images) at `body-lg`, with a dedicated slider to scale further for active rehearsal use.

---

## 3. Shapes & Radii

| Token | Value | Usage |
|---|---|---|
| `none` | 0px | — |
| `sm` | 6px | — |
| `md` | 12px | **Standard card radius** — structured yet modern |
| `lg` | 16px | **Bottom sheet top corners** — wide, welcoming curve when swiped up |
| `xl` | 24px | Large container insets |
| `full` | 9999px | FABs, pill buttons ("Join Zoom", "Acknowledge"), avatars, status indicators |

---

## 4. Spacing — the 8-point grid

Margins, padding, and gaps are strict multiples of 8 (8, 16, 24, 32); 4px is reserved for internal micro-adjustments only.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Internal micro-adjustments only |
| `space-2` | 8px | — |
| `space-3` | 12px | **Card rhythm** — gap between scrolling feed items |
| `space-4` | 16px | **Default screen margin** — universal left/right padding |
| `space-6` | 24px | **Breathing room** — separates major sections ("TODAY" vs. "EARLIER THIS WEEK") |
| `space-8` | 32px | — |
| `space-12` | 48px | **Minimum touch target size** |
| `space-safe-bottom` | 34px | iOS Home Indicator clearance |

### 4.1 Touch targets & ergonomics

- **Strict 48px rule:** no interactive element may have a hit area smaller than 48×48pt (`space-12`) — non-negotiable for a multigenerational user base.
- **Bottom-heavy design:** the most-used actions (FABs, primary form CTA) anchor to the bottom, reachable by thumb.

---

## 5. Elevation & Depth

| Level | Shadow value | Application |
|---|---|---|
| **Level 0** | `none` | The `canvas-base` background |
| **Level 1** | `0px 2px 4px rgba(15,23,42,0.04)` | Inactive form fields, subtle separators |
| **Level 2** | `0px 4px 8px rgba(15,23,42,0.06), 0px 1px 3px rgba(15,23,42,0.04)` | **Default** — Repertoire, Event, and Feed Announcement cards; a gentle lift |
| **Level 3** | `0px 10px 15px rgba(15,23,42,0.08), 0px 4px 6px rgba(15,23,42,0.04)` | Sticky headers; pressed/active card state |
| **Level 4** | `0px 20px 25px rgba(15,23,42,0.1), 0px -4px 10px rgba(15,23,42,0.02)` | **Modal bottom sheets** — Y-offset reversed to cast shadow upward |
| **FAB** | `0px 12px 24px {shadow-tint-primary}` | Compose/Action FAB — luminous indigo glow |

### 5.1 Isometric & 3D transforms

Empty states ("No rehearsals scheduled") and leader compliance dashboards replace flat illustrations with isometric 3D components via React Native Matrix Transforms (`rotateX`, `rotateZ`) — "Refined Elegance" applied to otherwise mundane data views.

---

## 6. Core Components — token recipes

**`screen-container`**
```
backgroundColor: canvas-base
paddingHorizontal: space-4
```

**`card-base`**
```
backgroundColor: canvas-elevated
rounded: md
padding: space-4
shadow: level-2
marginBottom: space-3
```

**`button-primary`**
```
background: gradient-action-primary
textColor: on-color
typography: body-md
rounded: full
height: 48px
paddingHorizontal: space-6
justifyContent: center
alignItems: center
```

**`button-ghost`**
```
backgroundColor: transparent
textColor: interactive-base
typography: body-sm
height: 48px
paddingHorizontal: space-4
```

**`fab-compose`**
```
background: gradient-action-primary
shadow: level-fab
rounded: full
height: 64px
width: 64px
position: absolute
bottom: space-6
right: space-4
```

**`badge-vocal-part`**
```
backgroundColor: interactive-ghost
textColor: interactive-base
typography: badge
rounded: sm
paddingVertical: space-1
paddingHorizontal: space-2
```

**`bottom-sheet-modal`**
```
backgroundColor: canvas-elevated
roundedTopLeft: lg
roundedTopRight: lg
shadow: level-4
padding: space-6
```

**`pill-offline`**
```
backgroundColor: canvas-inset
textColor: ink-secondary
typography: caption
rounded: full
paddingVertical: space-1
paddingHorizontal: space-3
border: 1px solid hairline
```

---

## 7. Component Specifications (detailed)

### 7.1 Announcement Feed Card (`card-base`)

The central unit of communication.

- **Structure:** white card on slate background (Level 2 elevation).
- **Header:** avatar or category icon, poster's name (`body-sm`), timestamp (`caption`).
- **Priority stripe:** 4px vertical color stripe on the left edge denoting category (Purple = Rehearsal, Emerald = Payment, etc.).
- **Body:** crisp `body-md` text.
- **Action row:** if action is required, a full-width `button-primary` or ghost button sits at the bottom inside the card — no detail-screen tap required.

### 7.2 Repertoire / Song Card

Used in the Library tab.

- **Header:** song title in `heading-2` (obsidian).
- **Vocal part badge:** top-right `badge-vocal-part`. A Tenor's profile shows "TENOR" in Electric Indigo on a ghost indigo background.
- **Audio player:** integrated directly into the card — circular play button (`rounded.full`) plus a waveform or progress bar.
- **Offline indicator:** a `pill-offline` chip ("✓ Available Offline") appears once the 2G-friendly caching engine has pre-fetched the audio.

### 7.3 Floating Action Button (`fab-compose`)

Role-gated to leaders/coordinators.

- **Styling:** 64×64px, fully rounded, bottom-right.
- **Vibrancy:** `gradient-action-primary` fill, elevated with the `level-fab` tinted shadow.
- **Motion:** on press, a Reanimated `spring-stiff` profile shrinks it to 0.9× scale before springing back.

### 7.4 Continuous Bottom Sheet (`bottom-sheet-modal`)

Used instead of a new screen for Song Lyrics, Solfa, or Form filling — preserves spatial context.

- **Motion:** slides up via `spring-fluid`.
- **Backdrop:** darkens the underlying UI to `rgba(15, 23, 42, 0.4)`.
- **Styling:** `rounded.lg` top corners, drag-handle pill at top center.

---

## 8. Do's and Don'ts

### ✅ Do

- **Use gradients for primary actions.** The Indigo/Violet gradient on the FAB and primary buttons is the core aesthetic differentiator of the app.
- **Respect the offline-first reality.** Always include text-based fallbacks (Solfa text) and the `pill-offline` indicator, so members trust that Airplane mode during church is safe.
- **Use the tinted shadow for high-elevation elements.** A black shadow on a vibrant gradient looks dirty — use `rgba(79, 70, 229, 0.25)` for FABs.
- **Scale text dynamically.** Plus Jakarta Sans must flow properly at larger system font sizes.
- **Use continuous layout animations.** A "Paid" row on the leader dashboard should glide out via Reanimated, never vanish instantly.

### ❌ Don't

- **Don't use flat colors for large primary CTAs.** Violates the "Vibrant" mandate.
- **Don't hide actions behind extra taps.** "Join Zoom," "Acknowledge," "RSVP" belong directly on the `card-base` in the feed.
- **Don't use dense lists.** Keep `space-4` padded cards with `space-3` gaps — never an Excel-spreadsheet feel.
- **Don't use standard blue for links.** Use `interactive-base` (Electric Indigo) for brand cohesion.
- **Don't make touch targets smaller than 48px.** Even a simple "✕" close icon needs a 48×48 hit area.
