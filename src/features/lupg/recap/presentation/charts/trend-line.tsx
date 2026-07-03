// Multi-line trend chart (kelompok mode metrics) — one line per percent metric across 12 months.
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { usePresentationAnimation } from '../context/animation-context'
import { EditorialTooltipShell, hairlineAxisProps } from './chart-primitives'

export interface TrendLineSeries {
  code: string
  name: string
  values: Array<number | null>
}

export interface TrendLineProps {
  xLabels: string[]
  series: TrendLineSeries[]
  yDomain?: [number, number]
  xAxisTitle?: string
  yAxisTitle?: string
}

type WideRow = { month: string } & Record<string, number | null | string>

interface TooltipPayloadEntry {
  name?: string
  value?: number | null
  dataKey?: string
  color?: string
}

interface TipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  seriesByCode: Map<string, TrendLineSeries>
  palette: PresPalette
}

function CustomTooltip({ active, payload, label, seriesByCode, palette }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({
      code: String(p.dataKey),
      name: seriesByCode.get(String(p.dataKey))?.name ?? String(p.dataKey),
      color: p.color ?? palette.primary,
      value: p.value as number,
    }))
    .sort((a, b) => b.value - a.value)
  if (rows.length === 0) return null
  return (
    <EditorialTooltipShell title={label ?? ''} palette={palette}>
      {rows.map((r) => (
        <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: 999, background: r.color, display: 'inline-block' }}
          />
          <span>
            {r.name}: {r.value}%
          </span>
        </div>
      ))}
    </EditorialTooltipShell>
  )
}

interface LastDotProps {
  cx?: number
  cy?: number
  index?: number
  value?: number | null
  stroke: string
  lastIdx: number
  totalIdx: number
  palette: PresPalette
}

function LastPointDot({ cx, cy, index, value, stroke, lastIdx, totalIdx, palette }: LastDotProps) {
  if (cx == null || cy == null || index == null) return <g />
  if (value == null || !Number.isFinite(value)) return <g />
  const isLast = index === lastIdx
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        stroke={stroke}
        strokeWidth={1.5}
        fill='#ffffff'
      />
      {isLast ? (
        <text
          x={cx + (lastIdx === totalIdx - 1 ? -8 : 8)}
          y={cy - 8}
          textAnchor={lastIdx === totalIdx - 1 ? 'end' : 'start'}
          style={{
            fontFamily: palette.fontMono,
            fontWeight: 700,
            fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
            fill: palette.ink,
          }}
        >
          {value}%
        </text>
      ) : null}
    </g>
  )
}

interface CustomLegendProps {
  series: TrendLineSeries[]
  palette: PresPalette
}

function CustomLegend({ series, palette }: CustomLegendProps) {
  return (
    <div className='flex flex-wrap items-center justify-center gap-4 pt-2'>
      {series.map((s, idx) => (
        <div key={s.code} className='flex items-center gap-2'>
          <span
            aria-hidden
            style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              background: palette.chart[idx % palette.chart.length],
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: palette.fontSans,
              fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
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

export function TrendLine({
  xLabels,
  series,
  yDomain = [0, 100],
  xAxisTitle,
  yAxisTitle,
}: TrendLineProps) {
  const palette = usePresPalette()
  const { durationScale } = usePresentationAnimation()
  const axisTitleStyle = {
    fontFamily: palette.fontMono,
    fontSize: 'clamp(0.75rem, 1vw, 1rem)',
    fontWeight: 700,
    letterSpacing: '0.2em',
    fill: palette.muted,
  } as const
  if (series.length === 0) {
    return (
      <div
        className='flex h-full w-full items-center justify-center'
        style={{
          fontFamily: palette.fontSans,
          fontSize: 'clamp(1rem, 1.4vw, 1.5rem)',
          color: palette.muted,
        }}
      >
        Belum ada data metrik
      </div>
    )
  }
  const data: WideRow[] = xLabels.map((label, i) => {
    const row: WideRow = { month: label }
    for (const s of series) {
      const v = s.values[i]
      row[s.code] = v == null ? null : v
    }
    return row
  })

  const lastIdxByCode = new Map<string, number>()
  for (const s of series) {
    let lastIdx = -1
    for (let i = 0; i < s.values.length; i++) {
      const v = s.values[i]
      if (v != null && Number.isFinite(v)) lastIdx = i
    }
    lastIdxByCode.set(s.code, lastIdx)
  }

  const seriesByCode = new Map<string, TrendLineSeries>()
  for (const s of series) seriesByCode.set(s.code, s)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex-1 overflow-hidden'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data} margin={{ top: 28, right: 32, bottom: 36, left: 36 }}>
            <CartesianGrid
              strokeDasharray='3 3'
              vertical={false}
              stroke={palette.rule}
            />
            <XAxis
              dataKey='month'
              interval={0}
              {...hairlineAxisProps(palette, 'x')}
              label={
                xAxisTitle
                  ? {
                      value: xAxisTitle,
                      position: 'bottom',
                      offset: 12,
                      style: axisTitleStyle,
                    }
                  : undefined
              }
            />
            <YAxis
              ticks={[0, 25, 50, 75, 100]}
              domain={yDomain}
              tickFormatter={(n: number) => `${n}%`}
              {...hairlineAxisProps(palette, 'y')}
              label={
                yAxisTitle
                  ? {
                      value: yAxisTitle,
                      angle: -90,
                      position: 'insideLeft',
                      offset: 0,
                      style: { ...axisTitleStyle, textAnchor: 'middle' },
                    }
                  : undefined
              }
            />
            <Tooltip
              cursor={{ stroke: palette.rule, strokeWidth: 1 }}
              content={(p) => (
                <CustomTooltip
                  {...(p as unknown as Omit<TipProps, 'seriesByCode' | 'palette'>)}
                  seriesByCode={seriesByCode}
                  palette={palette}
                />
              )}
            />
            {series.map((s, idx) => {
              const stroke = palette.chart[idx % palette.chart.length]
              const lastIdx = lastIdxByCode.get(s.code) ?? -1
              const totalIdx = xLabels.length
              return (
                <Line
                  key={s.code}
                  type='monotone'
                  dataKey={s.code}
                  stroke={stroke}
                  strokeWidth={2.5}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={Math.round(800 * durationScale)}
                  dot={(p) => (
                    <LastPointDot
                      key={`dot-${s.code}-${(p as { index?: number }).index ?? 0}`}
                      {...(p as Omit<LastDotProps, 'stroke' | 'lastIdx' | 'totalIdx' | 'palette'>)}
                      stroke={stroke}
                      lastIdx={lastIdx}
                      totalIdx={totalIdx}
                      palette={palette}
                    />
                  )}
                  activeDot={{ r: 5, stroke, strokeWidth: 2, fill: '#ffffff' }}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <CustomLegend series={series} palette={palette} />
    </div>
  )
}
