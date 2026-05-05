/**
 * Formats a rupiah value into a short display string.
 * - ≥ 1 juta → "1.2jt" or "12jt" (no decimal above 10jt)
 * - ≥ 1 ribu → "500rb"
 * - below → "N" (raw, id-ID locale)
 *
 * `withPrefix` prepends "Rp " (default true). Pass false when the caller
 * wants to compose its own prefix (e.g. "Total Desa MTD Rp ...").
 */
export function formatRupiahShort(n: number, withPrefix = true): string {
  const prefix = withPrefix ? 'Rp ' : ''
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${prefix}${m >= 10 ? Math.round(m) : m.toFixed(1)}jt`
  }
  if (n >= 1_000) return `${prefix}${Math.round(n / 1000)}rb`
  return `${prefix}${n.toLocaleString('id-ID')}`
}
