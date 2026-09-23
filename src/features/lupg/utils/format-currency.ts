const groupedNumberFormatter = new Intl.NumberFormat('id-ID')
const oneDecimalFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
})
const integerFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

/**
 * Formats a rupiah value into a short display string.
 * - ≥ 1 juta → "1,2 jt" or "12 jt" (no decimal above 10 jt)
 * - ≥ 1 ribu → "500 rb"
 * - below → "N" (raw, id-ID locale)
 *
 * `withPrefix` prepends "Rp " (default true). Pass false when the caller
 * wants to compose its own prefix (e.g. "Total Desa MTD Rp ...").
 */
export function formatRupiahShort(n: number, withPrefix = true): string {
  const prefix = withPrefix ? 'Rp ' : ''
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    const amount = (m >= 10 ? integerFormatter : oneDecimalFormatter).format(m)
    return `${prefix}${amount} jt`
  }
  if (n >= 1_000)
    return `${prefix}${groupedNumberFormatter.format(Math.round(n / 1000))} rb`
  return `${prefix}${groupedNumberFormatter.format(n)}`
}
