import { PROGRAM_STATUS_THRESHOLDS } from '@/features/lupg/programs/constants'

/**
 * Heatmap tier bucketing for kelompok × month % cells.
 * Shared between recap composite layout (Spec 2) and BI dashboard (Spec 3).
 *
 * Thresholds are sourced from PROGRAM_STATUS_THRESHOLDS so all tiles agree.
 */
export type Bucket = 'h' | 'ml' | 'l' | 'x'

export function getBucket(value: number | null | undefined): Bucket {
  if (value == null || Number.isNaN(value)) return 'x'
  if (value >= PROGRAM_STATUS_THRESHOLDS.ok) return 'h'
  if (value >= PROGRAM_STATUS_THRESHOLDS.warn) return 'ml'
  return 'l'
}

/**
 * Tailwind background + foreground class string per bucket.
 * Uses semantic tokens (--success / --warning / --destructive) so palette-aware.
 * Keep cell chrome (border/rounded/padding) separate — caller composes.
 */
export function bucketClass(bucket: Bucket): string {
  switch (bucket) {
    case 'h':
      return 'bg-success/15 text-success'
    case 'ml':
      return 'bg-warning/20 text-warning-foreground dark:text-warning'
    case 'l':
      return 'bg-destructive/15 text-destructive'
    case 'x':
    default:
      return 'bg-muted/40 text-muted-foreground'
  }
}

/**
 * Status categorization for KPI chips. Matches bucket thresholds.
 */
export type Status = 'ok' | 'warn' | 'crit' | 'none'

export function getStatus(value: number | null | undefined): Status {
  if (value == null || Number.isNaN(value)) return 'none'
  if (value >= PROGRAM_STATUS_THRESHOLDS.ok) return 'ok'
  if (value >= PROGRAM_STATUS_THRESHOLDS.warn) return 'warn'
  return 'crit'
}

/**
 * Tailwind class for a status dot/bar fill (solid, not tinted).
 * Used by TileProgramRanked and TileKehadiranMetrics for the bar color.
 */
export function statusBg(status: Status): string {
  switch (status) {
    case 'ok':
      return 'bg-success'
    case 'warn':
      return 'bg-warning'
    case 'crit':
      return 'bg-destructive'
    default:
      return 'bg-muted'
  }
}
