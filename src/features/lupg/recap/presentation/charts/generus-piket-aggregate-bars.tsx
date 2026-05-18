// 12-month grouped bar chart: aggregate Generus avg vs Piket LUPG avg per
// month. Series use chart[0] / chart[1] from the active palette.
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
import {
  EditorialTooltipShell,
  hairlineAxisProps,
  MiniLegend,
  RestrainedTopLabel,
  type RestrainedTopLabelProps,
} from './chart-primitives'
import { usePresPalette, type PresPalette } from '../use-pres-palette'

export interface GenerusPiketAggregateBarsProps {
  monthLabels: string[]
  generusValues: Array<number | null>
  piketValues: Array<number | null>
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
  palette: PresPalette
}

function AggregateTooltip({ active, payload, label, palette }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({
      key: String(p.dataKey),
      name:
        p.dataKey === 'generus'
          ? 'Rata-rata Generus'
          : p.dataKey === 'piket'
            ? 'Rata-rata Piket LUPG'
            : (p.name ?? ''),
      color: p.color ?? palette.chart[0],
      value: p.value as number,
    }))
  if (rows.length === 0) return null
  return (
    <EditorialTooltipShell title={label ?? ''} palette={palette}>
      {rows.map((r) => (
        <div
          key={r.key}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: r.color,
              display: 'inline-block',
            }}
          />
          <span>
            {r.name}: {r.value}%
          </span>
        </div>
      ))}
    </EditorialTooltipShell>
  )
}

export function GenerusPiketAggregateBars({
  monthLabels,
  generusValues,
  piketValues,
}: GenerusPiketAggregateBarsProps) {
  const palette = usePresPalette()
  const colorGenerus = palette.chart[0]
  const colorPiket = palette.chart[1]

  const rows = monthLabels.map((m, i) => ({
    month: m,
    generus: generusValues[i] ?? null,
    piket: piketValues[i] ?? null,
  }))

  const allEmpty = rows.every((r) => r.generus == null && r.piket == null)

  return (
    <div className='flex h-full flex-col'>
      <div className='min-h-0 flex-1'>
        {allEmpty ? (
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
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={rows}
              margin={{ top: 28, right: 24, bottom: 24, left: 24 }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke={palette.rule}
              />
              <XAxis dataKey='month' interval={0} {...hairlineAxisProps(palette, 'x')} />
              <YAxis
                ticks={[0, 25, 50, 75, 100]}
                domain={[0, 100]}
                tickFormatter={(n: number) => `${n}%`}
                width={42}
                {...hairlineAxisProps(palette, 'y')}
              />
              <Tooltip
                cursor={{ fill: palette.muted, fillOpacity: 0.08 }}
                content={(p) => (
                  <AggregateTooltip
                    {...(p as unknown as Omit<TipProps, 'palette'>)}
                    palette={palette}
                  />
                )}
              />
              <Bar
                dataKey='generus'
                name='Rata-rata Generus'
                fill={colorGenerus}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey='generus'
                  content={(p) => (
                    <RestrainedTopLabel
                      {...(p as unknown as Omit<RestrainedTopLabelProps, 'palette'>)}
                      palette={palette}
                    />
                  )}
                />
              </Bar>
              <Bar
                dataKey='piket'
                name='Rata-rata Piket LUPG'
                fill={colorPiket}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey='piket'
                  content={(p) => (
                    <RestrainedTopLabel
                      {...(p as unknown as Omit<RestrainedTopLabelProps, 'palette'>)}
                      palette={palette}
                    />
                  )}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <MiniLegend
        palette={palette}
        entries={[
          { name: 'Rata-rata Generus', color: colorGenerus },
          { name: 'Rata-rata Piket LUPG', color: colorPiket },
        ]}
      />
    </div>
  )
}
