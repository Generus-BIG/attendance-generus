/**
 * Status thresholds used across Desa Overview BI tiles.
 *
 * Program % (kelompok average hit rate vs target):
 *   ≥ 80  → ok    (success)
 *   60-79 → warn  (warning)
 *   < 60  → crit  (destructive)
 *
 * Kehadiran % (average attendance per metric):
 *   ≥ 85  → ok    (success)
 *   70-84 → warn  (warning)
 *   < 70  → crit  (destructive)
 *
 * Kept separate because program "on target" is a stricter bar than
 * kehadiran "acceptable attendance." Changing either requires
 * coordinating this file + the copy in desa-kpi-strip.tsx.
 */
export const PROGRAM_STATUS_THRESHOLDS = {
  ok: 80,
  warn: 60,
} as const

export const KEHADIRAN_STATUS_THRESHOLDS = {
  ok: 85,
  warn: 70,
} as const

/**
 * The target line drawn on program % bars. Matches `PROGRAM_STATUS_THRESHOLDS.ok`.
 */
export const PROGRAM_TARGET_PCT = PROGRAM_STATUS_THRESHOLDS.ok

/**
 * Band descriptions used by the heatmap legend strip.
 */
export const PROGRAM_STATUS_BANDS = [
  { label: `≥ ${PROGRAM_STATUS_THRESHOLDS.ok}%`, status: 'ok' as const },
  {
    label: `${PROGRAM_STATUS_THRESHOLDS.warn}–${PROGRAM_STATUS_THRESHOLDS.ok - 1}%`,
    status: 'warn' as const,
  },
  { label: `< ${PROGRAM_STATUS_THRESHOLDS.warn}%`, status: 'crit' as const },
]
