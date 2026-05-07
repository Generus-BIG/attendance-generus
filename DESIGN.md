# DESIGN.md

## Overview

**Creative North Star: "The Plain Register."** A competent, quiet tool. No committed chromatic identity — the product's personality is carried by clarity, typographic hierarchy, and responsive structure, not by a brand colour. Shadcn-admin new-york baseline, used as-is. Closer in spirit to Linear or Notion than to Anthropic or Height.app.

The core move is restraint. This is an operator tool for real data (peserta, attendance, shodaqoh, sensus) in a religious/community context — the data does the talking, the chrome stays out of the way. If chrome starts to feel "designed" or "branded," something is wrong.

Three first-class viewports:
- **Admin desktop** — longer focused sessions reviewing submissions, approving participants, exporting rekap. Keyboard-heavy, multi-tab, dense tables.
- **Team Manager mobile** — fast data entry between community activities. Older users, patchy signal, 44×44px touch targets, forms that don't fight the device.
- **Projector / Presentation Mode** — leadership audience, 2-metre viewing. Neutral palette holds well at distance because it doesn't compete with itself.

Personality: **neutral, workmanlike, reliable.** Mood words: quiet, considered, legible, consistent.

Anti-references: bootstrap admin templates with coloured stripes and badges everywhere; crypto/AI dashboards (neon, gradients, glassmorphism, purple-to-pink); over-branded SaaS chrome; warm editorial aesthetics that announce themselves.

Language is Bahasa Indonesia throughout.

---

## Colors

All values in OKLCH. No brand accent — chrome is neutral slate. Charts get the shadcn default vibrant palette when series differentiation genuinely helps (attendance categories, program types).

### Light Mode

| Name | Token | Value | Role |
|---|---|---|---|
| Canvas | `--background` | `oklch(1 0 0)` | Pure white page |
| Ink | `--foreground` | `oklch(0.129 0.042 264.695)` | Body text — near-black with a hair of slate tint (hue 264, chroma 0.042); reads as neutral |
| Primary | `--primary` / `--brand-accent` | `oklch(0.208 0.042 265.755)` | Dark slate near-black — CTAs, active states |
| Primary Foreground | `--primary-foreground` | `oklch(0.984 0.003 247.858)` | Near-white |
| Secondary / Accent | `--secondary` / `--accent` / `--muted` | `oklch(0.968 0.007 247.896)` | Very light cool gray — subtle surface lift |
| Secondary Text | `--muted-foreground` | `oklch(0.554 0.046 257.417)` | Secondary labels, captions |
| Border | `--border` / `--input` | `oklch(0.929 0.013 255.508)` | Cool-gray hairline |
| Ring | `--ring` | `oklch(0.704 0.04 256.788)` | Focus indicator — mid slate |
| Destructive | `--destructive` | `oklch(0.577 0.245 27.325)` | Red — delete, error, alpa |
| Success | `--success` | `oklch(0.55 0.14 150)` | Semantic success green |

### Dark Mode

Shadcn convention: very dark gray neutrals, pure near-white primary, matching destructive red.

| Token | Value |
|---|---|
| `--background` | `oklch(0.12 0 0)` |
| `--foreground` | `oklch(0.98 0 0)` |
| `--card` | `oklch(0.0 0 0)` (solid black) |
| `--primary` | `oklch(0.98 0 0)` (inverted — near-white on dark) |
| `--destructive` | `oklch(0.6 0.2 25)` |

### Chart Palette (Shadcn Default Rainbow)

Used **only** for chart series differentiation. Never as decorative accents in UI chrome.

| Token | Light | Dark |
|---|---|---|
| `--chart-1` | `oklch(0.646 0.222 41.116)` (orange) | `oklch(0.7 0.15 200)` (blue) |
| `--chart-2` | `oklch(0.6 0.118 184.704)` (teal) | `oklch(0.65 0.15 150)` (green) |
| `--chart-3` | `oklch(0.398 0.07 227.392)` (dark blue) | `oklch(0.75 0.15 80)` (yellow) |
| `--chart-4` | `oklch(0.828 0.189 84.429)` (yellow) | `oklch(0.6 0.2 280)` (purple) |
| `--chart-5` | `oklch(0.769 0.188 70.08)` (amber) | `oklch(0.65 0.2 30)` (red-orange) |

### Heatmap Ramp (Attendance Density)

**Neutral grayscale, 5-tier.** No brand hue — density readable as pure lightness gradient.

| Tier | Light | Dark | Label |
|---|---|---|---|
| 0 | `oklch(0.97 0 0)` | `oklch(0.20 0 0)` | no meeting |
| 1 | `oklch(0.88 0 0)` | `oklch(0.32 0 0)` | <25% |
| 2 | `oklch(0.72 0 0)` | `oklch(0.46 0 0)` | 25–49% |
| 3 | `oklch(0.50 0 0)` | `oklch(0.62 0 0)` | 50–74% |
| 4 | `oklch(0.25 0 0)` | `oklch(0.82 0 0)` | ≥75% |

### Rules

- No coloured brand accent in UI chrome. `--brand-accent` resolves to `--primary` (dark slate).
- Charts may use the vibrant rainbow only when series differentiation genuinely helps. Never use chart colours as decorative accents in non-chart surfaces.
- Heatmap is neutral grayscale — resist the urge to "warm it up" with a hue.
- Destructive red is reserved for genuinely destructive or error states. Not for "warning" (use muted-foreground or a neutral Badge instead).
- Never pure black or pure white in text — use the slate-tinted `--foreground` / `--primary-foreground` which read as neutral but avoid the harshness of absolute values.
- WCAG AA minimum across all surfaces. Presentation Mode targets ≥ 7:1.

---

## Typography

### Stack

- **Geist** variable (Google Fonts, 100–900) — `--font-sans`. Primary UI sans. Modern humanist, excellent at both 14px tables and display sizes. Fallback: Inter → system-ui → sans-serif.
- **Geist Mono** variable (Google Fonts, 100–900) — `--font-mono`. Tabular numerals, code, timestamps. `font-variant-numeric: tabular-nums` enforced on number columns.

No serif in the default stack. No display font. If editorial emphasis is ever needed, system serif stack is available but should not become a habit.

Legacy aliases `--font-inter`, `--font-manrope`, `--font-geist`, `--font-geist-mono` resolve to the above for backward compatibility.

### Type Scale

| Step | Size | Weight | Tracking | Line-height | Use |
|---|---|---|---|---|---|
| Display | 36–48px | 700 | −0.02em | 1.1 | Presentation mode hero numbers, major section openers |
| Heading 1 | 24–28px | 700 | −0.015em | 1.25 | Page titles |
| Heading 2 | 18–20px | 600 | −0.01em | 1.35 | Section headings, dialog titles |
| Heading 3 | 16px | 600 | 0 | 1.4 | Sub-sections, card titles |
| Body | 14px (min) / 15px (preferred) | 400 | 0 | 1.55 | All prose and UI |
| Body Small | 13px | 400 | 0 | 1.5 | Secondary copy, captions |
| Label | 12px | 500 | +0.04em | — | Uppercase eyebrow labels, column headers |
| Mono / Tabular | 13px | 400 | tabular-nums | 1.5 | Numbers in columns, dates, codes |

### Rules

- Sans everywhere. Quietness is the point.
- Always `font-variant-numeric: tabular-nums` on numbers that live in columns.
- Body minimum 14px, preferred 15px.
- Line-length cap 65–75ch on prose blocks.
- Scale ratio ≥ 1.25 between heading steps.
- Line-height scales inversely with size.
- Never all-caps body text. Reserve uppercase for short labels and column headers.
- Weight contrast does hierarchy work — prefer weight changes over size jumps when space is tight.

---

## Elevation

**Philosophy: flat-leaning. Shadow appears conservatively via shadcn primitives — never decoratively.**

| Level | Value | Used for |
|---|---|---|
| None | — | Most surfaces. Cards with 1px border, no shadow. |
| `shadow-xs` | `0 1px 2px rgb(0 0 0 / 0.05)` | Interactive elements (buttons) — very subtle depth marker |
| `shadow-sm` | `0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Cards when a shadcn Card is used; popovers; dropdown menus |
| `shadow-md`+ | — | **Never in UI chrome.** Only for full-bleed modal overlays, if ever. |

### Surface-shift hierarchy

Depth from hairlines and surface variants, not from stacked shadows:

1. `--background` (canvas white) — page floor
2. `--card` (white) — lifted surface, marked by border rather than shadow
3. `--muted` / `--accent` / `--secondary` (very light cool gray) — grouped section, inactive region
4. `--border` — division between all of the above

### Rules

- Never `shadow-md` or heavier in UI chrome.
- Never use `box-shadow` as a decorative accent (colour glows, neumorphism stacks).
- Focus rings: `--ring` with `outline-ring/50` at 50% opacity. Always visible, never garish.
- Hover states: subtle background shift (`hover:bg-accent`). Never `transform: scale()` or `translateY()` — no lift, no wiggle.

---

## Components

### Button

Six shadcn variants, used as-is:
- **Primary**: dark slate fill, near-white text. Default action per viewport.
- **Secondary**: `--secondary` fill, slate text, no border.
- **Outline**: transparent + border. Non-primary CTAs.
- **Ghost**: transparent, no border. Tertiary actions, icon buttons.
- **Destructive**: red fill, white text. Delete, remove, reject.
- **Link**: text + underline on hover.

Base: `rounded-md` (~8px from `--radius` 0.625rem minus 2px), Geist 13px/500, `shadow-xs`, `cursor: pointer`.

### Card

`shadow-sm border bg-card` at `rounded-xl` (derived from base radius). Use sparingly — many groupings are better as heading + border-bottom + content block. Never nest cards inside cards.

### Badge

Shadcn default variants:
- `default` — slate fill (near-primary)
- `secondary` — light-gray fill
- `outline` — transparent + border
- `destructive` — red fill

For attendance status:
- **Hadir** → `default` or `secondary`
- **Izin** → `outline` or `secondary` with muted-foreground text
- **Alpa** → `destructive`

Radius `rounded-md`, 11px/500.

### Input / Form Fields

`border-input bg-background rounded-md shadow-xs`. Focus: 2px slate ring at 2px offset. Mobile: `font-size: 16px` enforced (prevents iOS zoom, set in `index.css`).

### DatePicker

Wraps `Calendar` + `Popover`. Disables future dates and dates before 1900. Indonesian locale (`dd MMM yyyy`). Callers: participant dialog, attendance dialog, settings, forms. Update all if signature changes.

DB date serialization: `format(d, 'yyyy-MM-dd')` to save, `parse(s, 'yyyy-MM-dd', new Date())` to load. Never `new Date(s)` or `.toISOString().slice(0,10)`.

### DataTable

TanStack Table v8 with `useTableUrlState` (pagination + filters → URL). Responsive columns via `meta.className` container query classes (`hidden @2xl/content:table-cell`). Parent scroll container requires `@container/content` — set once in `authenticated-layout.tsx`.

Numbers: `font-variant-numeric: tabular-nums`. Dates: `whitespace-nowrap`. Status: Badge with semantic variant.

### Dialog / Sheet / Popover

**Dialog**: focused single actions, confirmations. Always wrap destructive actions in `ConfirmDialog` (`AlertDialog`).
**Sheet**: contextual side panels (record detail, filter drawer).
**Popover**: inline secondary content.

Never use Dialog as a lazy default — often Sheet, Popover, or inline expansion is better.

### Sidebar / Navigation

Collapsible, state persisted to `sidebar_state` cookie. Two workspaces (Absensi / LUPG) switched via `TeamSwitcher`. Active nav item: `--accent` background fill + `--accent-foreground` text. No coloured side indicator.

Hiding a nav item is NOT access control. Route protection lives in `ROUTE_ACCESS` + `admin/route.tsx`.

### Presentation Mode

Full-viewport overlay (`fixed inset-0 z-50`). Separate type scale: hero numbers 96–160px (Geist, weight 700), titles 48–64px. Contrast ≥ 7:1. Keyboard: ←/→/Space/PageDown/PageUp/Home/End/Esc. Fullscreen via `requestFullscreen()`. Built for 2-metre viewing.

---

## Do's and Don'ts

### Always

- Use shadcn primitives as-is. Extend the idiom, don't invent.
- Use `font-variant-numeric: tabular-nums` on every number in a column.
- Use `gap` over margins for sibling spacing.
- Let structure and typography carry identity — never a coloured accent stripe.
- Use `format(d, 'yyyy-MM-dd')` to serialize dates (date-fns). `parse(s, 'yyyy-MM-dd', new Date())` to deserialize.
- Enforce `ROUTE_ACCESS` for protected routes — hiding a nav item is not protection.
- Use `ConfirmDialog` for every destructive or irreversible action.
- Use `.refine((d) => d <= new Date(), ...)` for Zod date validators (not `.max()` — stale at module-load in long-lived SPA).
- Minimum 44×44px touch targets in TM mobile flows.
- Test Presentation Mode at 2-metre viewing distance; target ≥ 7:1 contrast.

### Never

- Introduce a coloured brand accent in UI chrome. This baseline is deliberately neutral.
- Use chart colours as decorative accents outside of actual charts.
- Use `border-left` or `border-right` > 1px as a coloured accent stripe on cards, list items, callouts, or alerts.
- Use gradient text (`background-clip: text` + gradient).
- Use glassmorphism (blur + semi-transparent backgrounds as decoration).
- Use neon-on-dark or AI gradient palettes (cyan/purple/pink gradients).
- Use `shadow-md` or heavier in UI chrome.
- Animate hover states with `transform: scale()` or `translateY()` — no lift.
- `new Date(dateString)` or `.toISOString().slice(0,10)` for date serialization.
- Use the `accordion` shadcn primitive — not installed. Use flat grouped lists instead.
- Nest cards inside cards.
- Use emojis in UI chrome.
- Use pure black (`#000`) or pure white (`#fff`) in text — use the slate-tinted tokens which read as neutral but avoid harsh absolutes.
- Use serif fonts for body or UI. If serif is ever needed for editorial emphasis, system stack only — do not normalize it.
