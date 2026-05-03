/**
 * Pure SVG polyline point-string builder for inline sparklines.
 * Shared between recap composite layout (Spec 2) and BI dashboard (Spec 3).
 *
 * Input values are %; nulls mean "no data" and are skipped (line breaks visually
 * if at ends, interpolated across if internal — see handling in caller).
 */

export interface SparklineOpts {
  width: number
  height: number
  /** Optional y-axis clamp. Defaults to min/max of values (with 5% padding). */
  yMin?: number
  yMax?: number
  /** Padding inside the SVG viewBox so stroke isn't clipped. Default 2. */
  padding?: number
}

export function sparklineDomain(
  values: Array<number | null | undefined>
): { yMin: number; yMax: number } {
  const nums = values.filter(
    (v): v is number => v != null && !Number.isNaN(v)
  )
  if (nums.length === 0) return { yMin: 0, yMax: 100 }
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  // Clamp to [0, 100] with a small breathing room if the span is narrow.
  const span = max - min
  const pad = span < 10 ? 5 : span * 0.05
  return {
    yMin: Math.max(0, Math.floor(min - pad)),
    yMax: Math.min(100, Math.ceil(max + pad)),
  }
}

/**
 * Returns a space-separated "x,y x,y ..." string suitable for <polyline points>.
 * Null/undefined values are skipped — consecutive nulls create visible gaps
 * (the polyline will simply draw between the surrounding defined points).
 */
export function polylinePoints(
  values: Array<number | null | undefined>,
  opts: SparklineOpts
): string {
  const { width, height, padding = 2 } = opts
  const { yMin, yMax } =
    opts.yMin != null && opts.yMax != null
      ? { yMin: opts.yMin, yMax: opts.yMax }
      : sparklineDomain(values)

  if (values.length === 0 || yMax === yMin) return ''

  const innerW = Math.max(1, width - padding * 2)
  const innerH = Math.max(1, height - padding * 2)
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0

  const pts: string[] = []
  values.forEach((v, i) => {
    if (v == null || Number.isNaN(v)) return
    const x = padding + i * stepX
    // invert y: high value → top
    const y =
      padding + innerH - ((v - yMin) / (yMax - yMin)) * innerH
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  })

  return pts.join(' ')
}

/**
 * Returns the (x, y) coordinate for a single value at `index` in the sparkline,
 * using the same domain + padding math as `polylinePoints`. Useful for placing
 * trailing dots or annotation markers over the line.
 * Returns null when the value is missing or the domain collapses.
 */
export function pointFor(
  values: Array<number | null | undefined>,
  index: number,
  opts: SparklineOpts
): { x: number; y: number } | null {
  const v = values[index]
  if (v == null || Number.isNaN(v)) return null
  const { width, height, padding = 2 } = opts
  const { yMin, yMax } =
    opts.yMin != null && opts.yMax != null
      ? { yMin: opts.yMin, yMax: opts.yMax }
      : sparklineDomain(values)
  if (yMax === yMin) return null
  const innerW = Math.max(1, width - padding * 2)
  const innerH = Math.max(1, height - padding * 2)
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0
  const x = padding + index * stepX
  const y = padding + innerH - ((v - yMin) / (yMax - yMin)) * innerH
  return { x, y }
}
