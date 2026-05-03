/**
 * Heatmap tier bucketing for kelompok × month % cells.
 * Shared between recap composite layout (Spec 2) and BI dashboard (Spec 3).
 *
 * Thresholds (mirror spec):
 *   ≥ 90  → 'h'  (high, strong green)
 *   85-89 → 'mh' (medium-high, mid green)
 *   75-84 → 'm'  (medium, soft green)
 *   70-74 → 'ml' (medium-low, amber)
 *   < 70  → 'l'  (low, red)
 *   null  → 'x'  (no data / future placeholder)
 */
export type Bucket = 'h' | 'mh' | 'm' | 'ml' | 'l' | 'x'

export function getBucket(value: number | null | undefined): Bucket {
  if (value == null || Number.isNaN(value)) return 'x'
  if (value >= 90) return 'h'
  if (value >= 85) return 'mh'
  if (value >= 75) return 'm'
  if (value >= 70) return 'ml'
  return 'l'
}

/**
 * Tailwind background + foreground class string per bucket.
 * Keep cell chrome (border/rounded/padding) separate — caller composes.
 */
export function bucketClass(bucket: Bucket): string {
  switch (bucket) {
    case 'h':
      return 'bg-emerald-500/20 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100'
    case 'mh':
      return 'bg-emerald-400/15 text-emerald-800 dark:bg-emerald-300/15 dark:text-emerald-100'
    case 'm':
      return 'bg-emerald-300/10 text-emerald-700 dark:bg-emerald-200/10 dark:text-emerald-200'
    case 'ml':
      return 'bg-amber-400/20 text-amber-900 dark:bg-amber-300/20 dark:text-amber-100'
    case 'l':
      return 'bg-red-500/20 text-red-900 dark:bg-red-400/20 dark:text-red-100'
    case 'x':
    default:
      return 'bg-muted/40 text-muted-foreground'
  }
}

/**
 * Status categorization for KPI chips (status strip rail).
 *   ≥ 85 → 'ok'
 *   70-84 → 'warn'
 *   < 70  → 'crit'
 *   null  → 'none' (no data)
 */
export type Status = 'ok' | 'warn' | 'crit' | 'none'

export function getStatus(value: number | null | undefined): Status {
  if (value == null || Number.isNaN(value)) return 'none'
  if (value >= 85) return 'ok'
  if (value >= 70) return 'warn'
  return 'crit'
}

/** Tailwind top-border class for KPI chip status rail. */
export function statusRailClass(status: Status): string {
  switch (status) {
    case 'ok':
      return 'border-t-2 border-t-emerald-500'
    case 'warn':
      return 'border-t-2 border-t-amber-500'
    case 'crit':
      return 'border-t-2 border-t-red-500'
    case 'none':
    default:
      return 'border-t-2 border-t-muted'
  }
}
