// Tunable thresholds for the Absensi dashboard. Centralized here so future
// changes (e.g. exposing via app_settings) are a single-file edit.

// Pie/donut label gating: hide labels for slices below this fraction (0–1).
export const PIE_LABEL_MIN_FRACTION = 0.08

// Follow-up table at-risk threshold: rows below this attendance % are flagged
// red, but only past mid-month so early-month zeros don't false-positive.
export const AT_RISK_RATE_PCT = 25

// KPI delta thresholds: below this magnitude the card reads as "Stabil"
// rather than up/down arrow.
export const KPI_DELTA_THRESHOLDS = {
  pp: 0.5, // percentage points
  decimal: 0.05, // raw float (e.g. avgHadirPerMeeting)
  count: 0.5, // integer count
} as const
