// Paired grouped bar chart: Kehadiran vs Piket LUPG across N recent months
// for one Kategori. Series use chart[0] / chart[1] from the active palette.
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
import { usePresentationAnimation } from '../context/animation-context'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import {
  EditorialTooltipShell,
  hairlineAxisProps,
  MiniLegend,
  RestrainedTopLabel,
  type RestrainedTopLabelProps,
} from './chart-primitives'

export interface PairedMonthBarsProps {
  title: string
  monthLabels: string[]
  kehadiran: Array<number | null>
  piket: Array<number | null>
  height?: number
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

function PairedTooltip({ active, payload, label, palette }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload.reduce<
    Array<{ key: string; name: string; color: string; value: number }>
  >((rows, p) => {
    const value = p.value
    if (value == null || !Number.isFinite(value)) return rows
    rows.push({
      key: String(p.dataKey),
      name:
        p.dataKey === 'kehadiran'
          ? 'Kehadiran'
          : p.dataKey === 'piket'
            ? 'Piket LUPG'
            : (p.name ?? ''),
      color: p.color ?? palette.chart[0],
      value,
    })
    return rows
  }, [])
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

export function PairedMonthBars({
  title,
  monthLabels,
  kehadiran,
  piket,
}: PairedMonthBarsProps) {
  const palette = usePresPalette()
  const { durationScale } = usePresentationAnimation()
  const colorKehadiran = palette.chart[0]
  const colorPiket = palette.chart[1]

  const eyebrowStyle = {
    fontFamily: palette.fontMono,
    fontSize: 'clamp(0.75rem, 1vw, 1rem)',
    fontWeight: 500,
    letterSpacing: '0.2em',
    color: palette.muted,
  } as const
  const titleStyle = {
    fontFamily: palette.fontSans,
    fontSize: 'clamp(1.25rem, 1.6vw, 1.75rem)',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.01em',
    color: palette.ink,
  } as const

  const rows = monthLabels.map((m, i) => ({
    month: m,
    kehadiran: kehadiran[i] ?? null,
    piket: piket[i] ?? null,
  }))

  const allEmpty = rows.every(
    (r) =>
      (r.kehadiran == null || r.kehadiran === 0) &&
      (r.piket == null || r.piket === 0)
  )

  return (
    <div className='flex h-full flex-col gap-3'>
      <div>
        <div className='uppercase' style={eyebrowStyle}>
          KATEGORI
        </div>
        <h3 style={titleStyle}>{title}</h3>
      </div>
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
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={rows}
              margin={{ top: 24, right: 12, bottom: 12, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke={palette.rule}
              />
              <XAxis
                dataKey='month'
                interval={0}
                {...hairlineAxisProps(palette, 'x')}
              />
              <YAxis
                ticks={[0, 50, 100]}
                domain={[0, 100]}
                tickFormatter={(n: number) => `${n}%`}
                width={32}
                {...hairlineAxisProps(palette, 'y')}
              />
              <Tooltip
                cursor={{ fill: palette.muted, fillOpacity: 0.08 }}
                content={(p) => (
                  <PairedTooltip
                    {...(p as unknown as Omit<TipProps, 'palette'>)}
                    palette={palette}
                  />
                )}
              />
              <Bar
                dataKey='kehadiran'
                name='Kehadiran'
                fill={colorKehadiran}
                isAnimationActive={true}
                animationDuration={Math.round(800 * durationScale)}
              >
                <LabelList
                  dataKey='kehadiran'
                  content={(p) => (
                    <RestrainedTopLabel
                      {...(p as unknown as Omit<
                        RestrainedTopLabelProps,
                        'palette'
                      >)}
                      palette={palette}
                    />
                  )}
                />
              </Bar>
              <Bar
                dataKey='piket'
                name='Piket LUPG'
                fill={colorPiket}
                isAnimationActive={true}
                animationDuration={Math.round(800 * durationScale)}
              >
                <LabelList
                  dataKey='piket'
                  content={(p) => (
                    <RestrainedTopLabel
                      {...(p as unknown as Omit<
                        RestrainedTopLabelProps,
                        'palette'
                      >)}
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
          { name: 'Kehadiran', color: colorKehadiran },
          { name: 'Piket LUPG', color: colorPiket },
        ]}
      />
    </div>
  )
}
