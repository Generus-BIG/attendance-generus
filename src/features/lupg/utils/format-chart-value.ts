export type ChartValueFormat =
  | 'percent'
  | 'number'
  | 'rupiah'
  | 'rupiah-compact'

export function formatChartValue(
  value: number | null | undefined,
  format: ChartValueFormat = 'number'
): string {
  if (value == null || Number.isNaN(value)) return '-'
  switch (format) {
    case 'percent':
      return `${Math.round(value)}%`
    case 'number':
      return value.toLocaleString('id-ID')
    case 'rupiah':
      return `Rp${value.toLocaleString('id-ID')}`
    case 'rupiah-compact':
      return formatRupiahCompact(value)
  }
}

function formatRupiahCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`
  if (abs >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`
  if (abs >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`
  return `Rp${value.toLocaleString('id-ID')}`
}

export function makeAxisFormatter(format: ChartValueFormat) {
  return (value: number) => formatChartValue(value, format)
}
