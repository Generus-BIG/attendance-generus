/**
 * Heatmap tier bucketing for kelompok × month % cells.
 * Shared between recap composite layout (Spec 2) and BI dashboard (Spec 3).
 *
 * Thresholds (3-tier scheme — matches `getStatus` below):
 *   ≥ 70  → 'h'  (green — on target / above)
 *   40-69 → 'ml' (orange — warning)
 *   < 40  → 'l'  (red — critical)
 *   null  → 'x'  (no data / future placeholder)
 */
export type Bucket = 'h' | 'ml' | 'l' | 'x'

export function getBucket(value: number | null | undefined): Bucket {
  if (value == null || Number.isNaN(value)) return 'x'
  if (value >= 70) return 'h'
  if (value >= 40) return 'ml'
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
 * Status categorization for KPI chips.
 *   ≥ 70 → 'ok'   (green)
 *   40-69 → 'warn' (orange)
 *   < 40  → 'crit' (red)
 *   null  → 'none' (no data)
 */
export type Status = 'ok' | 'warn' | 'crit' | 'none'

export function getStatus(value: number | null | undefined): Status {
  if (value == null || Number.isNaN(value)) return 'none'
  if (value >= 70) return 'ok'
  if (value >= 40) return 'warn'
  return 'crit'
}
