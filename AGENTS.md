# AGENTS.md

This file provides guidance to AI agents (Claude Code, OpenCode, etc.) when working with code in this repository.

## Important Rules

- **DO NOT commit any changes to git.** No `git add`, `git commit`, or `git push`. The user will handle all git operations manually.
- **Keep AGENTS.md in sync.** Update this file whenever there's a major change: refactoring, new features that change architecture, new DB triggers/RPCs, or changes to conventions/workflow instructions. Minor bug fixes or typo corrections do NOT require an update.
- RBAC is live — roles are `super_admin`, `admin`, `team_manager`, `member` (see [src/lib/rbac.ts](src/lib/rbac.ts)). Route access is declared in `ROUTE_ACCESS`, enforced by `String.startsWith` in [src/routes/admin/route.tsx](src/routes/admin/route.tsx), so sub-routes inherit their parent's rule. Claims come from `auth.jwt() -> 'app_metadata'`. Keep `ROUTE_ACCESS` in sync with sidebar visibility gating — hiding a nav item alone is not protection.
- **DATE columns in Supabase**: serialize with `format(d, 'yyyy-MM-dd')` from `date-fns`, deserialize with `parse(s, 'yyyy-MM-dd', new Date())`. Never use `new Date(s)` or `.toISOString().slice(0,10)` — both shift the day for non-UTC users. See `toDateOnly` / `fromDateOnly` in [participants-context.tsx](src/features/participants/context/participants-context.tsx).

## Skills & MCP Tools

**Before starting non-trivial work, check if a relevant skill applies** — even a 1% chance means invoke it. Process skills (brainstorming, systematic-debugging) come first; implementation skills come second.

Key skills for this repo:
- **`supabase-postgres-best-practices`** — before writing SQL queries, designing schemas, adding indexes/triggers, or debugging RLS. Reference rule files in `.agents/skills/supabase-postgres-best-practices/references/`.
- **`react-vite-best-practices`** — before configuring Vite, optimizing bundle size, code splitting, or React performance work.
- **`shadcn`** — when adding/modifying shadcn/ui components or working with `components.json`.
- **`systematic-debugging`** — before proposing fixes for any bug or unexpected behavior.
- **`brainstorming`** — before any creative work (new features, components, behavior changes).

**MCP tools** (when available in the session):
- **Supabase MCP**: `apply_migration`, `execute_sql`, `list_tables`, `generate_typescript_types`, `get_advisors`, `get_logs` — use for schema changes and debugging RLS issues. Run `get_advisors` after every migration.
- **Context7 MCP**: library docs lookup (Zustand v5, TanStack Router v1, date-fns v4, Supabase JS v2, etc.). Use this instead of relying on training data for library APIs.
- **Exa MCP**: web search for current best practices and up-to-date information. Use for research when docs/training data may be stale.

Regenerate TypeScript types into `src/lib/database.types.ts` after every schema change (`mcp__supabase__generate_typescript_types`). Do NOT retype the global `supabase` client with `<Database>` — it cascades type errors in existing attendance queries that use `any`-casts.

## Project Overview

Admin dashboard for the MuMiBig organization, built on the `shadcn-admin` template. Two workspaces coexist in one app:

- **Absensi MuMiBig** — operational (participants, attendance, forms, approvals)
- **LUPG** — monthly reporting & monitoring (laporan bulanan kelompok, sensus, program tracker, sarpras, shodaqoh, resume mustin, rekap desa, presentation mode)

Workspace switching is via `TeamSwitcher` in the sidebar; state lives in `useWorkspaceStore` (cookie-persisted) and syncs with URL prefix (`/admin/absensi/*` vs `/admin/lupg/*`).

Reference PPT slides & workflow docs in `reference-ppt/` describe the original manual reporting format that LUPG replaces.

Design specs + implementation plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server (regenerates routeTree.gen.ts)
pnpm build            # TypeScript check + Vite production build (tsc -b && vite build)
pnpm lint             # ESLint
pnpm format:check     # Prettier check
pnpm format           # Prettier auto-fix
pnpm knip             # Find unused exports/dependencies
```

Package manager is **pnpm** (not npm/yarn). No test framework is installed — verify changes via `pnpm build` (tsc) + `pnpm lint` + manual browser check.

If `pnpm build` fails with "missing route" errors, run `pnpm exec vite build` first to regenerate `src/routeTree.gen.ts`, then `pnpm build` again.

## Environment Variables

Requires `.env.local` with:
```
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_ANON_KEY=<supabase_anon_key>
```

## Architecture

### Stack
React 19 + Vite 7 (SWC) + TypeScript ~5.9 + Tailwind CSS v4 (Vite plugin, no `tailwind.config`) + shadcn/ui (new-york style) + TanStack Router v1 + TanStack Query v5 + Zustand v5 + Supabase JS v2 + react-hook-form + zod + date-fns v4.

### Routing (TanStack Router — file-based)

- `src/routes/` — route files; auto-generates `src/routeTree.gen.ts` (never edit manually)
- Route files are thin: define `validateSearch` (zod), set `component` to a feature page
- `(auth)/` — public auth pages
- `admin/route.tsx` — auth guard + workspace-default redirect (reads `useWorkspaceStore` + `WORKSPACE_DEFAULT_PATH`) + `ROUTE_ACCESS` enforcement
- `admin/absensi/*` — attendance workspace routes
- `admin/lupg/*` — reporting workspace routes; admin-only by default (`dashboard`, `recap`, `recap/present`, `mustin`, `config`). Team managers see `reports`, `programs`, `presentation`, `sensus`
- `/absensi/$formId` and `/register/add-participant` — public routes (no auth)
- Router context passes `queryClient` via `createRootRouteWithContext`

### Workspace Architecture (LUPG vs Absensi)

Two parallel sidebars dispatched by active workspace:

- `src/components/layout/data/sidebar-data.ts` — dispatcher (exports `WORKSPACE_TEAMS`, `WORKSPACE_DEFAULT_PATH`, `getSidebarData(role, kelompok, user, workspace)`)
- `sidebar-data-absensi.ts` / `sidebar-data-lupg.ts` — per-workspace nav groups
- `src/stores/workspace-store.ts` — Zustand store holding `activeWorkspace: 'absensi' | 'lupg'`, persisted to `active_workspace` cookie
- `src/hooks/use-active-workspace.ts` — syncs store with URL (reads pathname, updates store if mismatch)
- `TeamSwitcher` in sidebar header triggers `setActiveWorkspace` + `navigate` to workspace default

### Data Layer

- **No REST API / axios for fetching.** All data access via Supabase JS client (`src/lib/supabase.ts`). `database.types.ts` holds generated Supabase types (regenerate via `mcp__supabase__generate_typescript_types`). The client is currently **not typed globally** (`createClient(...)` without `<Database>`) to avoid breaking legacy `any`-cast queries in attendance services — LUPG services cast return values to row types locally using `as SomeRow`.
- Service functions: `src/features/<feature>/services.ts` (Absensi pattern) or `src/features/<feature>/services/<name>.service.ts` (LUPG pattern — one file per resource)
- TanStack Query wraps service calls; global `staleTime: 10_000` (10s)
- Axios imported only for error-type detection in QueryClient's `onError` — not for HTTP calls

### Participants Data Model

- `participants` table has `birth_date DATE` and `birth_place TEXT` (both nullable; filled gradually by Team Managers). CHECK constraint: `birth_date IS NULL OR (birth_date <= CURRENT_DATE AND birth_date > '1900-01-01')`.
- `KATEGORI` app-side = `['A', 'B', 'AR', 'APR']` → mapped to DB `lookup_values` values `'GPN A', 'GPN B', 'AR', 'APR'` by `mapKategoriToDb` / `mapKategoriFromDb` in [participants-context.tsx](src/features/participants/context/participants-context.tsx).
- A DB trigger (`tg_participants_auto_promote_gpn`, see below) auto-promotes GPN A → GPN B when `calculate_age(birth_date) >= 23`. Never demotes. Never touches AR/APR. Spec: [docs/superpowers/specs/2026-04-30-participant-birthdate-autoswitch-design.md](docs/superpowers/specs/2026-04-30-participant-birthdate-autoswitch-design.md).
- Public register form (`/register/add-participant`) collects `birth_date` + `birth_place` into `pending_participants`; `approvalService.approve()` carries them into `participants` on approval, so the trigger auto-promotes qualifying approvals.

### LUPG Data Model (Supabase)

All LUPG tables prefixed `lupg_`. Container pattern: one `lupg_monthly_reports` row per kelompok per month (`draft` → `submitted` lifecycle), with child tables referencing it:
- `lupg_sensus` (master) + `lupg_sensus_snapshots` (frozen at submit via DB trigger)
- `lupg_program_definitions` / `lupg_program_reports` (generic: Turba, GOMA, GMKM, PHQ, Sholat ACR, Nikah JM)
- `lupg_metric_definitions` / `lupg_metric_reports` (configurable; seed = 5 attendance % metrics)
- `lupg_sarpras_items` / `lupg_sarpras_reports` (14 seeded items, global checklist)
- `lupg_shodaqoh` (1:1 with monthly report)
- `lupg_mustin_notes` + `lupg_mustin_templates` (templates seed the per-report notes; see `mustin-section.tsx`)

**Penerapan 29 Karakter assessment**: `lupg_character_monitoring_reports.status` is nullable (`NULL` = Belum dinilai) and accepts `needs_guidance`, `not_applied`, `in_progress`, `consistent`, or `established`. `needs_guidance` means Perlu Pembinaan and requires a non-empty row-specific note; the note constraint is `NOT VALID` so historical coaching rows without notes remain visible for correction while new/edited rows are enforced. This assessment is collective per `jenjang × konteks penerapan`, not per participant or per individual character. Keep this status model separate from the legacy `lupg_character_target_reports.status` field.

### Sensus Auto-Sync (participant-derived)

Categories `GPN_A`, `GPN_B`, `AR`, `APR` are **auto-derived** from the `participants` table — not manually entered. The pipeline:
- **View** `lupg_sensus_participant_derived` (SECURITY INVOKER): aggregates active participants by `group_id × category × gender`. Covers all four categories.
- **Sync function** `lupg_sync_derived_sensus(p_kelompok_id)`: zero-out then upsert derived counts into `lupg_sensus`. Handles count→0 when participants leave.
- **Trigger** `tg_participants_sync_sensus` (AFTER INSERT/UPDATE OF status_active, category_id, group_id, gender OR DELETE): auto-calls sync for affected kelompok(s), including old kelompok on group transfer.

Categories `ACR`, `PENDIDIK_MT`, `PENDIDIK_MS` remain **manual entry** (no corresponding participant records). The frontend uses `DERIVED_SENSUS_CATEGORIES` set in [constants.ts](src/features/lupg/constants.ts) to render derived categories as read-only.

**RLS helpers (already in DB)**:
- `user_role()`, `user_kelompok()`, `user_kelompok_id()` — read from `auth.jwt() -> 'app_metadata'`
- `lupg_mr_readable(mr_id)`, `lupg_mr_writable(mr_id)` — EXISTS subqueries against monthly_reports for child-table policies

**Critical RLS nuance**: UPDATE policies on `lupg_monthly_reports` use separate `USING` (OLD row, team_manager needs `locked=false`) and `WITH CHECK` (NEW row, only scope match, NO locked check) — otherwise the submit-sets-locked flow fails WITH CHECK on the new row.

### Postgres triggers & helpers

- **`tg_lupg_monthly_report_submit` + `tg_lupg_monthly_report_snapshot`** on `lupg_monthly_reports`: enforce lock + `submitted_at`/`submitted_by` on `draft → submitted`; snapshot master sensus into `lupg_sensus_snapshots`; block team_manager from `submitted → draft` (admin unlock path).
- **`tg_participants_auto_promote_gpn`** on `participants` (BEFORE INSERT OR UPDATE OF birth_date, category_id): rewrites `category_id` from GPN A → GPN B when `calculate_age(NEW.birth_date) >= 23`. `SECURITY INVOKER` + `SET search_path = public, pg_temp`.
- **`tg_participants_sync_sensus`** on `participants` (AFTER INSERT OR UPDATE OF status_active, category_id, group_id, gender OR DELETE): auto-syncs `lupg_sensus` from participant data for GPN_A, GPN_B, AR, APR via `lupg_sync_derived_sensus()`. The trigger wrapper `fn_participants_sync_sensus()` is `SECURITY DEFINER` + `SET search_path = public, pg_temp` so authenticated participant writes can sync derived counts without granting direct RPC access to `lupg_sync_derived_sensus()`.
- **`calculate_age(DATE) RETURNS INT`** — day-accurate age helper, IMMUTABLE SQL. Used by the auto-promote trigger.

**When adding new Postgres functions**: always set a fixed `search_path` (`SET search_path = public, pg_temp` or empty string) to satisfy the `function_search_path_mutable` advisor. Prefer `SECURITY INVOKER`. Only use `SECURITY DEFINER` when cross-role access is required, and document the reason.

### State Management (3 layers)

1. **Zustand**:
   - `src/stores/auth-store.ts` — user, session, accessToken, role, kelompok
   - `src/stores/workspace-store.ts` — active workspace (absensi|lupg)
2. **TanStack Query** — all server/async state
3. **React Context** (`src/context/`) — UI state (theme, layout, sidebar, search). Feature contexts manage dialog `open` + `currentRow`

### DB-to-App Data Mapping (Absensi)

Absensi uses full category names in DB (`'GPN A'`, `'GPN B'`, `'Anak Remaja'`, `'AR'`, `'APR'`) but short codes in app (`'A'`, `'B'`, `'AR'`, `'APR'`). Mapping is duplicated across three files — keep them in sync when adding a kategori:
- `src/features/participants/context/participants-context.tsx` — primary `mapKategoriToDb` / `mapKategoriFromDb`
- `src/features/approvals/services.ts` — inline `mapDbCategoryToInternal` inside `getActiveParticipants`
- `src/features/forms/services.ts` — `mapInternalToDbCategories` (note: AR also maps to legacy `'Anak Remaja'`)

LUPG tables use canonical snake_case codes end-to-end (`ACR`, `APR`, `AR`, `GPN_A`, `GPN_B`, etc., see `src/features/lupg/constants.ts`).

### Feature Module Patterns

**Absensi (existing)** — each feature in `src/features/<feature>/`:
- `index.tsx` main page, `services.ts` queries, `components/`, `types.ts`, context/provider with `useDialogState`

**LUPG (Phase 1+)** — each feature in `src/features/lupg/<sub-feature>/`:
- Sub-features: `monthly-reports/`, `sensus/`, `recap/`, `mustin/`, `config/`, `dashboard/`, `programs/`, `presentation/`
- Shared services at `src/features/lupg/services/*.service.ts` (one file per resource)
- Shared hooks at `src/features/lupg/hooks/use-lupg-queries.ts` (all TanStack Query wrappers in one file)
- Shared: `types.ts` (Row types from `@/lib/database.types`), `constants.ts` (CATEGORY_CODES, PROGRAM_CODES, MUSTIN_STATUS_LABELS), `utils/month-utils.ts` (currentMonthKey, formatMonthLabel, shiftMonth, etc.), `components/` (MonthPicker, ReportStatusBadge, KelompokSelector)

### Dialog/CRUD Pattern

Absensi features use a provider holding `open` (dialog type string) and `currentRow`; a `Dialogs` component renders based on `open`.

LUPG Config (`src/features/lupg/config/*-tab.tsx`) uses react-hook-form + zod + shadcn `Dialog`/`AlertDialog` directly per tab (simpler than context provider since each tab is isolated).

### Table Pattern

TanStack Table v8 with shared components in `src/components/data-table/`. `useTableUrlState` hook syncs pagination/filters to URL search params. LUPG uses plain shadcn `Table` (read-only aggregations, no sorting/filtering needed so far).

Responsive tables (e.g. participants) use Tailwind container queries: the parent scroll container has `@container/content` (set in [authenticated-layout.tsx](src/components/layout/authenticated-layout.tsx)), and columns hide at breakpoints via `meta.className = cn('hidden @2xl/content:table-cell')`. Long cell values wrap with `whitespace-normal wrap-break-word max-w-[Nch]` (use Tailwind v4 canonical `wrap-break-word`, not legacy `break-words`).

### Edit Form Auto-Save Pattern (LUPG)

LUPG monthly report sections auto-save on blur per field:
- Each section uses local `useState` seeded from fetched row; `useEffect` re-syncs when `existing?.id` or `updated_at` changes
- `onBlur` handler calls `upsert*` mutation; error → toast via sonner
- No react-hook-form at section level (kept simple); form validation runs at submit-time only via the submit trigger + client checks
- Rows that come from templates (e.g. `mustin-section`) should offer the same "Hapus" action as free rows — once a template-backed note is deleted it reappears in the "Topik template yang belum ditambahkan" strip for re-adding

### Auto-promote / server-rewrite detection pattern

When a DB trigger may silently rewrite a column on INSERT/UPDATE (e.g. `category_id` on `participants`), mutations should `.select()` the affected column back and compare to the submitted value. See `createMutation` / `updateMutation` in [participants-context.tsx](src/features/participants/context/participants-context.tsx):
- On create, the form always has the kategori; compare submitted vs. returned → toast.
- On update, if kategori was not touched but `birthDate` was, **pre-read** the current category first (via a second `.select()` call), because only then can the client tell whether the trigger fired. The pre-read error is thrown, not swallowed.

### Export PDF + Presentation Mode (Phase 2)

- **Export PDF**: `window.print()` with inline `<style>@media print` in Rekap Desa + Tailwind `print:hidden` / `print:break-inside-avoid` / `print:shadow-none` utilities. No PDF lib dependency.
- **Presentation mode**: `/admin/lupg/recap/present?month=YYYY-MM` renders `<Presentation>` in `fixed inset-0 z-50` overlay. Slide list built via `buildSlides()` in `src/features/lupg/recap/presentation/slides.tsx`. Keyboard: `←/→/Space/PageDown/PageUp/Home/End/Esc`. Fullscreen via native `requestFullscreen()` API.

### Public Dashboard Sharing

Public read-only attendance dashboards shareable via token-based links (`/share/dashboard/$token`):
- **Table** `public_dashboard_shares` — admin-created share configs with `displayMode: 'monthly' | 'forms'`, `formMode: 'all' | 'selected'`, `visibleSections` (JSON, controls which dashboard sections render), `token` (auto-generated). RLS: admin-only CRUD.
- **RPC** `get_public_dashboard_payload(p_token, p_month)` — `SECURITY DEFINER` (required for anon access). Returns share config + forms + attendance records + census participants. **Privacy**: when `followUp` section is disabled, participant/attendance/census identifiers are replaced with deterministic md5 surrogate keys — real UUIDs are never exposed on public links. When `followUp` is enabled, real ids are returned (needed for the follow-up table).
- **Frontend**: [src/features/public-dashboard/](src/features/public-dashboard/) — `PublicDashboardPage` renders a read-only `MonthlyFormDashboard` with workspace-aware form selector. Monthly mode supports month navigation; fixed-forms mode aggregates across selected events.
- **Authority boundary**: anonymous clients do not read `attendance` or `participants` directly. Public participant search and attendance submission use active-form-scoped RPCs (`search_form_participants`, `submit_attendance_guarded`), while shared dashboards poll `get_public_dashboard_payload` every 15 seconds when the realtime log is enabled.
- **SSR/OG**: `api/share/dashboard/[token].ts` — server-side handler for Open Graph meta tags (no auth headers leaked in response).

### UI Components

- `src/components/ui/` — shadcn/ui primitives (excluded from ESLint). Add new ones via shadcn CLI. Note: `accordion` primitive is NOT installed (LUPG Rekap Desa Mustin section falls back to flat grouped list).
- `src/components/layout/` — app shell (sidebar, header, nav)
- `src/components/date-picker.tsx` — reusable `<DatePicker>` with disable-future + disable-before-1900 logic and Indonesian locale (`dd MMM yyyy`). Used by participant/attendance/settings/forms dialogs — keep callers in sync if the signature changes.
- Icons: Lucide React. Charts: Recharts (currently used only in attendance dashboard)

## Code Conventions

- `no-console: error` — no `console.log` in production code
- `@typescript-eslint/consistent-type-imports` — use `import { type Foo }` (inline type imports)
- `no-duplicate-imports` — enforced
- Unused vars must be prefixed with `_`
- Path alias: `@/` maps to `src/`
- Theme tokens are CSS variables in `src/styles/theme.css`
- Preferences (theme, sidebar, active workspace) stored in cookies, not localStorage
- **Navigate-with-dynamic-path in TanStack Router v1**: `WORKSPACE_DEFAULT_PATH` values are typed as `LinkProps['to']` to avoid `as never` casts on `navigate({ to })` / `redirect({ to })`
- Operator precedence: TS flags `x ?? y || z` as TS5076 — add parens: `x ?? (y || z)`
- **Date validators in zod**: prefer `.refine((d) => d <= new Date(), { message: ... })` over `.max(new Date(), ...)`. The latter captures the bound at module-load time and goes stale after midnight in long-lived SPA sessions.
- **Tailwind v4 canonicals**: prefer `wrap-break-word` over `break-words`, `w-35` over `w-[140px]`, etc. The editor flags non-canonical classes via `suggestCanonicalClasses`.

## Workspace URL Convention

- Existing Absensi routes (Phase 1a did NOT migrate) remain at `/admin/<feature>` — e.g., `/admin/dashboard`, `/admin/participants`, `/admin/attendance`, `/admin/forms`, `/admin/approvals`, `/admin/manage-role`.
- LUPG routes all under `/admin/lupg/*`: `dashboard`, `reports`, `reports/$monthlyReportId`, `recap`, `recap/present`, `mustin`, `programs`, `presentation`, `sensus`, `config`.
- The spec called for migrating Absensi to `/admin/absensi/*`; this is deferred. Current sidebar-data-absensi entries point to `/admin/*` (not `/admin/absensi/*`).

## Database Migrations

Schema changes are tracked in `supabase/migrations/` as timestamped `.sql` files. These are the **source of truth** for DB structure — they document what's been applied to the live Supabase project so fresh/staging DBs can be reproduced. Apply changes to live DB first (via Supabase MCP `apply_migration`), then create/commit the corresponding `.sql` file. Key migrations:

- `20260629000000_public_dashboard_shares.sql` — `public_dashboard_shares` table, constraints, RLS, RPC `get_public_dashboard_payload`
- `20260701000000_sensus_participant_auto_sync.sql` — view `lupg_sensus_participant_derived`, sync function, participant trigger
- `20260703042233_harden_participant_sensus_sync_trigger.sql` — runs participant sensus sync trigger wrapper as `SECURITY DEFINER` and keeps the sync helper non-callable by anon/authenticated roles
- `20260719000000_update_lupg_character_assessment_scale.sql` — nullable five-state collective character assessment, conservative legacy mapping, and required coaching-note constraint
- `20260722000000_harden_browser_authority_surfaces.sql` — removes broad anonymous attendance/participant access, adds form-scoped public RPCs, hardens Absensi/LUPG team boundaries, report audit fields, derived sensus, photo storage paths, and privileged function grants

## Known Debt / Future Improvements

These are acknowledged gaps worth folding into future work rather than silent surprises:

- **Centralize kategori DB-value mappings.** `'GPN A' | 'GPN B' | 'AR' | 'APR'` (DB) vs `'A' | 'B' | 'AR' | 'APR'` (app) strings are inlined across `participants-context.tsx`, `approvals/services.ts`, `forms/services.ts`, `lib/storage.ts`, `seed-data.ts`, `RegisterParticipantForm.tsx`, `PublicAttendanceForm.tsx`, dashboard-recap service. A single `KATEGORI_DB_VALUES` map in [src/lib/schema.ts](src/lib/schema.ts) would prevent the "forgot to add APR to mapper X" class of bug that recurs when new categories are introduced.
- **Extract `toDateOnly` / `fromDateOnly` helpers to `src/lib/utils.ts`.** Currently scoped inside `participants-context.tsx`; `approvals/services.ts` open-codes the same `format(..., 'yyyy-MM-dd')` pattern.
- **Legacy `src/lib/storage.ts`** still hardcodes `kategori: 'A' | 'B' | 'AR'` (no APR). Not breaking because Supabase is authoritative — consider deleting.
- **Pre-existing `SECURITY DEFINER` advisor WARNs** on `lupg_get_submitter_display`, `get_public_dashboard_payload`, `promote_eligible_gpn`, `submit_pending_attendance_guarded`. These are intentional (public link RPC + admin functions), but tighten `search_path` or document justification when feasible. Newer functions (`calculate_age`, `fn_participants_auto_promote_gpn`, `fn_participants_sync_sensus`) are hardened with fixed `search_path`; for trigger-only definer wrappers, revoke direct anon/authenticated execute where possible.
- **No scheduled job for daily re-evaluation.** GPN A → GPN B promotion is lazy (only fires when a participant row is inserted or its `birth_date` / `category_id` is updated). Participants who cross the 23-year threshold without being edited stay GPN A until a TM touches them. A nightly pg_cron job is the natural follow-up.
- **Absensi → `/admin/absensi/*` URL migration** was scoped in Phase 1a but deferred. Sidebar entries still point at `/admin/*`. If/when migrated, update `ROUTE_ACCESS` keys (prefix-matched) and sidebar-data-absensi in lockstep.
- **`accordion` shadcn primitive not installed** — Rekap Desa Mustin falls back to a flat grouped list. Install if you need collapsible groups.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in this repository’s GitHub Issues via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles use their default GitHub label names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
