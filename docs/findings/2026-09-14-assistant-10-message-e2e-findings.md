# Assistant 10-Message E2E: Findings

**Date:** 2026-09-14
**Status:** Verified live end-to-end (9/10 prompts sent; 10th blocked by tooling — itself a finding)
**Scope:** `http://localhost:5173/admin/absensi/assistant`, model GPT-5.6 Terra, Super Admin
**Method:** Orca computer-use on the open Edge window. Every send verified via fresh accessibility-tree text + screenshots, never via unverified action flags.
**Related:** `docs/plan/2026-09-12-ai-assistant-design.md`, `src/mastra/index.ts`, `src/mastra/http.ts`, `src/mastra/adapters.ts`, `src/features/assistant/assistant-page.tsx`

## Prompts and results

| # | Prompt (English) | Result |
|---|------------------|--------|
| 1 | Summarize this month's Absensi dashboard for September 2026. | PASS — `getAbsensiDashboardSummary`, empty-state card, source `/admin/dashboard`. Reports **0 forms / 0 hadir**, contradicting msgs 2–3/9 (65 records). Query-scope inconsistency, still open. |
| 2 | Show the daily attendance trend as a chart. | PASS — `getMonthlyAttendanceSummary`, Chart/Table toggle, 13 Sep 2026: 50 hadir + 15 izin = 65. |
| 3 | Break down September 2026 attendance by category GPN A, GPN B, and AR. | PASS — chart + table: GPN A 28/6, GPN B 19/6, AR 3/3. |
| 4 | Which kelompok had the highest attendance this month? | PASS (honest refusal) — "cannot determine kelompok from aggregate data… kategori tertinggi GPN A bukan identitas kelompok." Correctly surfaces a tool gap instead of guessing. |
| 5 | What about LUPG report completeness for September 2026? | PASS — cross-workspace allowed (LUPG explicitly named). 0/2 submitted, both draft 1/6. |
| 6 | And what about last month, August 2026? | PASS — anaphora resolved, stayed in LUPG: 5/5 submitted, 6/6 complete. |
| 7 | Break down your previous answer by gender if available, otherwise explain why not. | PASS — correctly explained no gender dimension on report completeness; pinned "Agustus 2026 (mengikuti permintaan sebelumnya)". |
| 8 | Show it as a table. | PASS with caveat — "it" resolved to Aug LUPG, but the model built a **synthetic markdown table** (`Laki-laki: Tidak tersedia`) instead of a validated `DataViewCard`. Honest content, unvalidated container. |
| 9 | List participant names who had izin notes in September 2026. Explicit request to include names. | PASS — participant table (11 names, 1 izin each), source notes "nama diminta secara eksplisit". Privacy gate works. Screenshot-verified. |
| 10 | What are your data sources and limitations? | NOT SENT — after 9 rich answers the accessibility tree exceeds Orca's 1200-node cap (`truncated:true`), the composer drops out of `get-app-state`, and coordinate/paste fallback hit the wrong receiver. See thread-growth finding. |

Side observations: prompts were English, answers mostly Indonesian (the "respond in the prompt's language" rule isn't holding); `Open source` navigation and Copy/Retry buttons worked throughout.

## Thread memory today

- There is **no server memory**. `assistantAgent` is created with no `memory:`, and `new Mastra(...)` falls back to the non-durable in-memory store. The dev-server warning is expected, not a crash:
  `[AGENT] No memory is configured but resourceId and threadId were passed in args`.
  The IDs come from the `@mastra/ai-sdk` transport, not from our code — `streamAdapter` (`src/mastra/adapters.ts`) never sets them.
- What feels like memory is **frontend history**: `useChatRuntime` resends the whole message array (cap: 100 messages / 256 KB body) and `normalizeHistory` (`src/mastra/http.ts`) forwards it statelessly. Msgs 6–8 prove follow-up resolution works — but it is ephemeral (lost on refresh/navigation by design) and unbounded within a session.

## Findings for next development

1. **Kill the warning on the lazy path.** Strip or ignore `threadId/resourceId` in `streamAdapter` (or set `memory: undefined` explicitly) so stateless mode is intentional, not a warning.
2. **Cap thread growth (real UX bug, proven by msg-10 failure).** Keep last ~20 messages client-side; drop older tool `output` blobs keeping text; add a visible **Clear chat** button (today only reload clears). Long threads already break assistive-tech operability at ~9 rich answers.
3. **Gate synthetic tables.** Render tool data only via `DataViewCard`; label model-written markdown tables as unverified or block numeric claims outside tool cards (msg-8 precedent).
4. **Fix the msg-1 vs msgs-2/3/9 scope inconsistency** (dashboard-summary 0 vs attendance-summary 65) before it erodes trust in grounded answers.
5. **If persistent threads are wanted**, they are a deliberate scope change, not a flag flip: own `assistant_threads/messages` tables (never domain tables), `resourceId=userId`, per-thread `workspace`, user-scoped server enforcement, thread list/rename/delete UI, per-workspace isolation, server-side summarization before the 256 KB cap — and a decision reconciling persistence with the current "no prompt logging" design boundary.
