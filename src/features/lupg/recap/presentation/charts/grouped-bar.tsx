// Grouped vertical bar chart (desa mode metrics) — one bar per kelompok within each metric category.
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import {
  EditorialTooltipShell,
  hairlineAxisProps,
  RestrainedTopLabel,
  type RestrainedTopLabelProps,
} from './chart-primitives'

export interface GroupedBarKelompok {
  id: string
  name: string
}

export interface GroupedBarRow {
  metric: string
  metricCode: string
  [kelompokId: string]: string | number | null
}

export interface GroupedBarProps {
  kelompoks: GroupedBarKelompok[]
  rows: GroupedBarRow[]
  yDomain?: [number, number]
  xAxisTitle?: string
  yAxisTitle?: string
}

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
  kelompokById: Map<string, GroupedBarKelompok>
  palette: PresPalette
}

function CustomTooltip({ active, payload, label, kelompokById, palette }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({
      id: String(p.dataKey),
      name: kelompokById.get(String(p.dataKey))?.name ?? String(p.dataKey),
      color: p.color ?? palette.chart[0],
      value: p.value as number,
    }))
  if (rows.length === 0) return null
  return (
    <EditorialTooltipShell title={label ?? ''} palette={palette}>
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

interface CustomLegendProps {
  kelompoks: GroupedBarKelompok[]
  palette: PresPalette
}

function CustomLegend({ kelompoks, palette }: CustomLegendProps) {
  return (
    <div className='flex flex-wrap items-center justify-center gap-4 pt-2'>
      {kelompoks.map((k, idx) => (
        <div key={k.id} className='flex items-center gap-2'>
          <span
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
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
            {k.name}
          </span>
        </div>
      ))}
    </div>
  )
}

export function GroupedBar({
  kelompoks,
  rows,
  yDomain = [0, 100],
  xAxisTitle,
  yAxisTitle,
}: GroupedBarProps) {
  const palette = usePresPalette()
  const axisTitleStyle = {
    fontFamily: palette.fontMono,
    fontSize: 'clamp(0.75rem, 1vw, 1rem)',
    fontWeight: 700,
    letterSpacing: '0.2em',
    fill: palette.muted,
  } as const
  if (rows.length === 0 || kelompoks.length === 0) {
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

  const kelompokById = new Map<string, GroupedBarKelompok>()
  for (const k of kelompoks) kelompokById.set(k.id, k)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex-1 overflow-hidden'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={rows} margin={{ top: 28, right: 24, bottom: 36, left: 36 }}>
            <CartesianGrid
              strokeDasharray='3 3'
              vertical={false}
              stroke={palette.rule}
            />
            <XAxis
              dataKey='metric'
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
              cursor={{ fill: 'rgba(30, 39, 97, 0.06)' }}
              content={(p) => (
                <CustomTooltip
                  {...(p as unknown as Omit<TipProps, 'kelompokById' | 'palette'>)}
                  kelompokById={kelompokById}
                  palette={palette}
                />
              )}
            />
            {kelompoks.map((k, idx) => (
              <Bar
                key={k.id}
                dataKey={k.id}
                name={k.name}
                fill={palette.chart[idx % palette.chart.length]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={k.id}
                  content={(p) => (
                    <RestrainedTopLabel
                      {...(p as Omit<RestrainedTopLabelProps, 'palette' | 'formatter'>)}
                      formatter={(n) => `${n}%`}
                      palette={palette}
                    />
                  )}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <CustomLegend kelompoks={kelompoks} palette={palette} />
    </div>
  )
}
