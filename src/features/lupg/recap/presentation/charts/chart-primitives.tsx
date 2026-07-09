// Shared chart helpers used across the LUPG presentation deck. Centralizes
// axis style, top-of-bar value labels, and the editorial tooltip shell so a
// future restyle touches one file. Each chart still owns its own tooltip body
// (every chart formats values differently); only the visual shell is shared.
import { type ReactNode } from 'react'
import { type PresPalette } from '../use-pres-palette'

// Hairline axis: no axis line, no tick line, mono ticks, palette.ink for X
// (foreground), palette.muted for Y (secondary). Pass returned object as
// `tick={...}` / `tickLine={false}` / `axisLine={false}` to Recharts XAxis or
// YAxis. Returns plain props rather than a wrapper component because Recharts
// requires its axis components to be direct children of the chart.
export function hairlineAxisProps(palette: PresPalette, axis: 'x' | 'y') {
  const fill = axis === 'x' ? palette.ink : palette.muted
  return {
    tickLine: false,
    axisLine: false,
    tick: {
      fontFamily: palette.fontMono,
      fontSize: '11px',
      fontWeight: 600,
      fill,
    } as const,
  }
}

// Restrained top-of-bar value label. Replaces the previous Archivo Black
// treatment. Used via Recharts <LabelList content={(p) => <RestrainedTopLabel
// {...(p as unknown as RestrainedTopLabelProps)} palette={palette}
// formatter={fmt} />} />.
export interface RestrainedTopLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: number | string | null
  palette: PresPalette
  formatter?: (n: number) => string
  hideZero?: boolean
  xOffset?: number
  yOffset?: number
}

export function RestrainedTopLabel({
  x,
  y,
  width,
  value,
  palette,
  formatter,
  hideZero = false,
  xOffset = 0,
  yOffset = -6,
}: RestrainedTopLabelProps) {
  const xNum = typeof x === 'number' ? x : Number(x)
  const yNum = typeof y === 'number' ? y : Number(y)
  const widthNum = typeof width === 'number' ? width : Number(width)
  const valueNum = typeof value === 'number' ? value : Number(value)
  if (
    !Number.isFinite(xNum) ||
    !Number.isFinite(yNum) ||
    !Number.isFinite(widthNum) ||
    !Number.isFinite(valueNum)
  ) {
    return null
  }
  if (hideZero && valueNum === 0) return null
  const text = formatter ? formatter(valueNum) : String(valueNum)
  return (
    <text
      x={xNum + widthNum / 2 + xOffset}
      y={yNum + yOffset}
      textAnchor='middle'
      style={{
        fontFamily: palette.fontMono,
        fontSize: '13px',
        fontWeight: 600,
        fill: palette.ink,
      }}
    >
      {text}
    </text>
  )
}

// Editorial tooltip shell. Caller supplies the body via `children`. Title is
// rendered in fontSans 700 (no Archivo Black) using brandAccent.
export interface EditorialTooltipShellProps {
  title: string
  palette: PresPalette
  children: ReactNode
}

export function EditorialTooltipShell({
  title,
  palette,
  children,
}: EditorialTooltipShellProps) {
  return (
    <div
      style={{
        background: palette.primary,
        color: palette.primaryFg,
        padding: '6px 10px',
        borderRadius: 4,
        fontFamily: palette.fontSans,
        fontSize: '12px',
        lineHeight: 1.45,
      }}
    >
      <div
        style={{
          fontFamily: palette.fontSans,
          fontWeight: 700,
          color: palette.brandAccent,
          fontSize: '13px',
          marginBottom: 2,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

// Mini legend row used by paired/aggregate charts.
export interface LegendEntry {
  name: string
  color: string
}

export interface MiniLegendProps {
  entries: LegendEntry[]
  palette: PresPalette
}

export function MiniLegend({ entries, palette }: MiniLegendProps) {
  return (
    <div className='flex flex-wrap items-center justify-center gap-4 pt-2'>
      {entries.map((s) => (
        <div key={s.name} className='flex items-center gap-2'>
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: s.color,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: palette.fontSans,
              fontSize: '13px',
              fontWeight: 600,
              color: palette.ink,
            }}
          >
            {s.name}
          </span>
        </div>
      ))}
    </div>
  )
}
