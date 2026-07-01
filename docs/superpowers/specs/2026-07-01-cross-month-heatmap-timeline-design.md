# Cross-Month Heatmap Fix: Smart Anchor + Timeline Strip

**Date:** 2026-07-01
**Status:** Approved (brainstorming complete)
**Scope:** Fix Finding 4 from public dashboard code review

## Problem

`AttendanceCalendarHeatmap` renders a single month grid. In fixed-forms / event-based mode (e.g. "asrama liburan sekolah"), forms can span multiple months. When that happens, only the anchor month's meetings are visible in the heatmap — cross-month events disappear.

Current anchor logic (`public-dashboard-page.tsx`): `dashboardMonthDate = firstForm.date` — picks the first form's month regardless of where the actual meetings cluster.

## Solution: Option C — Smart Anchor + Timeline Strip

Two-part fix:

1. **Smart anchor**: pick the month with the most meetings (not the first form's month). Ties broken by recency.
2. **Timeline strip**: a horizontal row of dots below the heatmap showing all event dates. Clicking a dot switches the anchor to that event's month. Encodes the temporal flow that the single-grid heatmap can't.

This keeps the existing heatmap visual intact (familiar, density-driven) while exposing cross-month data through an interactive, clickable timeline.

## Design Decisions

### 1. Anchor Selection

**Monthly mode** (`displayMode === 'monthly'`):
- No change. Anchor = the month the user is currently navigating (prev/next buttons). Timeline strip **hidden** — month nav already exists.

**Fixed forms mode** (`displayMode === 'forms'`):
- Anchor = month with the **most meetings**
- Tie → pick the **latest** month
- `meetings.length === 0` → fallback to first form's month (current behavior)
- Timeline strip **always shown** when `meetings.length > 0` (even single month — provides event ordering context)

### 2. Timeline Strip Component

**New file:** `src/features/dashboard/components/event-timeline-strip.tsx`

```ts
interface EventTimelineStripProps {
  meetings: MeetingRecap[]    // recap.meetings
  activeMonth: string         // 'YYYY-MM'
  onSelectMonth: (month: string) => void
}
```

**Rendering:**
- Placed **below the heatmap** (not above — heatmap remains the primary at-a-glance view)
- Title: `"Timeline event · klik dot untuk pindah anchor"`
- One dot per `meetings[].date`, chronologically ordered
- Dot color uses the same density tier as the heatmap (`var(--heatmap-1..4)`) — readable intensity at a glance
- Active month dots: 2px ring in `var(--primary)` around the dot
- Dashed SVG arc connects the dots to encode temporal flow
- Mobile (`< sm`): horizontal scroll, title hidden

### 3. Interactions & Data Flow

- **Click dot** → `onSelectMonth(YYYY-MM)` → parent updates anchor state → heatmap re-renders with new month, active ring moves to the clicked dot
- **Click heatmap cell** → existing drill-down behavior (unchanged)
- **Hover dot** → Radix `Tooltip` shows event title (from `forms[]` lookup by date) + `(hadir/izin)`
- **Hover cell** → existing tooltip (unchanged)
- **Animation:**
  - Dot hover: `translateY(-2px)`, 200ms `cubic-bezier(0.23, 1, 0.32, 1)` (Emil's strong ease-out)
  - Dot press: `scale(0.95)`
  - Active ring: `box-shadow 250ms ease-out`
  - Heatmap swap: React re-render (no special transition — content changes entirely)
  - Respect `prefers-reduced-motion` — disable translate/scale, keep opacity/ring only

### 4. Edge Cases

| Scenario | Behavior |
|---|---|
| 0 events | Strip hidden, heatmap shows "Belum ada pertemuan" existing state |
| 1 event | Single dot, no arc, no active ring needed |
| All events in 1 month | Strip shows (ordering context), arc is short/flat |
| Specific form selected (form selector) | Meetings filtered to that form first, then strip + heatmap |
| Desktop ≥ sm | Strip full-width with left label |
| Mobile < sm | Horizontal scroll, label hidden |

### 5. File Changes

| File | Change |
|---|---|
| `src/features/dashboard/components/event-timeline-strip.tsx` | **NEW** — strip component |
| `src/features/dashboard/utils/anchor-month.ts` | **NEW** — `computeAnchorMonth(meetings)` returns `'YYYY-MM'` |
| `src/features/dashboard/components/monthly-form-dashboard.tsx` | Add optional `activeMonth` + `onSelectMonth` props; render `<EventTimelineStrip>` below heatmap (only when `displayMode === 'forms'`) |
| `src/features/public-dashboard/components/public-dashboard-page.tsx` | Wire anchor state (`useState<string>`); compute via `computeAnchorMonth`; pass to `MonthlyFormDashboard`; replace first-form anchor with computed anchor |
| LUPG recap (if heatmap used there) | Check if pattern is reusable; if yes, refactor to share — otherwise out of scope |

## Out of Scope

- LUPG recap heatmap — only refactored if the pattern is naturally shareable. Otherwise this fix is public-dashboard only.
- Backfilling the timeline strip into the admin (non-public) dashboard — admin users navigate via the form selector, the timeline is most useful on public links.
- Changing the heatmap's visual design itself (cell sizing, color tiers) — this fix only adds the timeline strip and anchor logic.

## Testing Approach

No test framework installed. Verify via:
1. `pnpm build` (tsc + vite) — must pass with 0 errors
2. `pnpm lint` — must pass with 0 errors
3. Manual browser verification:
   - Monthly mode: strip hidden, month nav works
   - Single-month forms: strip shows dots, click switches month
   - Cross-month forms: anchor picks busiest month, strip shows all dots, click switches anchor
   - Specific form selected: strip filters to that form's dates
   - Drill-down (hover cell) still works
   - `prefers-reduced-motion` respected
   - Mobile: strip scrolls horizontally

## Migration

No DB changes. Frontend-only fix.
