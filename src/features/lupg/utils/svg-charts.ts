/**
 * Extended inline-SVG helpers: closed area paths + donut segments.
 * Complements `sparkline.ts` (which handles stroke-only polylines).
 * Shared by BI desa overview tiles (Spec 3).
 */
import { sparklineDomain } from './sparkline'

export interface AreaPathOpts {
  width: number
  height: number
  /** Optional y-axis clamp. Defaults to auto domain from values. */
  yMin?: number
  yMax?: number
  /** Padding inside viewBox. Default 2. */
  padding?: number
}

/**
 * Returns an SVG path `d` string representing a closed area under the
 * polyline defined by `values`. Null values break the line; the area
 * closes cleanly between defined-point runs.
 *
 * Result is suitable for `<path d={...} fill="...">`.
 */
export function areaPath(
  values: Array<number | null | undefined>,
  opts: AreaPathOpts
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
  const baselineY = padding + innerH

  const segments: string[] = []
  const run: { x: number; y: number }[] = []

  const flushRun = () => {
    if (run.length === 0) return
    const first = run[0]
    const last = run[run.length - 1]
    const d: string[] = []
    d.push(`M ${first.x.toFixed(1)} ${baselineY.toFixed(1)}`)
    d.push(`L ${first.x.toFixed(1)} ${first.y.toFixed(1)}`)
    for (let i = 1; i < run.length; i++) {
      d.push(`L ${run[i].x.toFixed(1)} ${run[i].y.toFixed(1)}`)
    }
    d.push(`L ${last.x.toFixed(1)} ${baselineY.toFixed(1)}`)
    d.push('Z')
    segments.push(d.join(' '))
    run.length = 0
  }

  values.forEach((v, i) => {
    if (v == null || Number.isNaN(v)) {
      flushRun()
      return
    }
    const x = padding + i * stepX
    const y = padding + innerH - ((v - yMin) / (yMax - yMin)) * innerH
    run.push({ x, y })
  })
  flushRun()

  return segments.join(' ')
}

export interface DonutSlice {
  /** Stable key for React (e.g. category code). */
  key: string
  /** Non-negative numeric value. Slices with value=0 render as zero-length arcs (skipped). */
  value: number
}

export interface DonutSegment {
  key: string
  /** Fraction of circumference occupied by this slice. */
  fraction: number
  /** `stroke-dasharray` value: "<arc> <gap>". */
  dashArray: string
  /** `stroke-dashoffset` value (negative offset = rotate clockwise). */
  dashOffset: string
}

export interface DonutOpts {
  radius: number
  /** Stroke width (donut thickness). */
  strokeWidth: number
}

/**
 * Splits slices into stroke-dasharray/offset values. Render each returned segment
 * as its own `<circle>` with the same radius + different `stroke-dashoffset`.
 */
export function donutSegments(
  slices: DonutSlice[],
  opts: DonutOpts
): DonutSegment[] {
  const total = slices.reduce((acc, s) => acc + Math.max(0, s.value), 0)
  const circumference = 2 * Math.PI * opts.radius
  if (total <= 0) return []

  let accumulated = 0
  return slices.map((s) => {
    const fraction = Math.max(0, s.value) / total
    const arc = circumference * fraction
    const gap = circumference - arc
    const dashArray = `${arc.toFixed(2)} ${gap.toFixed(2)}`
    const dashOffset = `${(-accumulated).toFixed(2)}`
    accumulated += arc
    return { key: s.key, fraction, dashArray, dashOffset }
  })
}
