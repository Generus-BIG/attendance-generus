// Sarpras donut chart (kelompok mode) — % fulfilled with center label and
// 2-slice legend. Sudah uses palette.success, Belum uses palette.muted at 35%.
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { usePresentationAnimation } from '../context/animation-context'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { EditorialTooltipShell } from './chart-primitives'

export interface SarprasDonutProps {
  fulfilled: number
  total: number
}

interface SliceDatum {
  name: string
  value: number
  fill: string
}

interface TooltipPayloadEntry {
  payload?: SliceDatum & { _total?: number }
}

interface TipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  palette: PresPalette
}

function CustomTooltip({ active, payload, palette }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload
  if (!datum || datum._total == null) return null
  const pct =
    datum._total > 0 ? Math.round((datum.value / datum._total) * 100) : 0
  return (
    <EditorialTooltipShell title={datum.name} palette={palette}>
      <div>Jumlah: {datum.value}</div>
      <div>Persentase: {pct}%</div>
    </EditorialTooltipShell>
  )
}

interface LegendItemProps {
  color: string
  label: string
  count: number
  palette: PresPalette
}

function LegendItem({ color, label, count, palette }: LegendItemProps) {
  return (
    <div className='flex items-center gap-2'>
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          background: color,
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
        {label}: {count}
      </span>
    </div>
  )
}

export function SarprasDonut({ fulfilled, total }: SarprasDonutProps) {
  const palette = usePresPalette()
  const { durationScale } = usePresentationAnimation()
  const colorSudah = palette.success
  const colorBelum = `color-mix(in oklch, ${palette.muted} 35%, ${palette.bg})`
  if (total <= 0) {
    return (
      <div
        className='flex h-full w-full items-center justify-center'
        style={{
          fontFamily: palette.fontSans,
          fontSize: 'clamp(1rem, 1.4vw, 1.5rem)',
          color: palette.muted,
        }}
      >
        Belum ada item sarpras
      </div>
    )
  }

  const safeFulfilled = Math.max(0, Math.min(fulfilled, total))
  const notFulfilled = total - safeFulfilled
  const pct = Math.round((safeFulfilled / total) * 100)

  const data: (SliceDatum & { _total: number })[] = [
    {
      name: 'Sudah Tercukupi',
      value: safeFulfilled,
      fill: colorSudah,
      _total: total,
    },
    {
      name: 'Belum Tercukupi',
      value: notFulfilled,
      fill: colorBelum,
      _total: total,
    },
  ]

  return (
    <div className='flex h-full w-full flex-col overflow-hidden'>
      <div className='relative min-h-0 flex-1'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart margin={{ top: 18, right: 24, bottom: 18, left: 24 }}>
            <Tooltip
              content={(p) => (
                <CustomTooltip
                  {...(p as unknown as Omit<TipProps, 'palette'>)}
                  palette={palette}
                />
              )}
            />
            <Pie
              data={data}
              dataKey='value'
              nameKey='name'
              cx='50%'
              cy='50%'
              innerRadius='34%'
              outerRadius='52%'
              stroke={palette.bg}
              strokeWidth={1}
              isAnimationActive={true}
              animationDuration={Math.round(800 * durationScale)}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
          <div
            style={{
              fontFamily: palette.fontMono,
              fontWeight: 700,
              fontSize: 'clamp(2.35rem, 4vw, 4rem)',
              lineHeight: 1,
              color: palette.ink,
            }}
          >
            {pct}%
          </div>
          <div
            className='flex flex-col items-center uppercase'
            style={{
              fontFamily: palette.fontMono,
              fontSize: 'clamp(0.58rem, 0.72vw, 0.82rem)',
              fontWeight: 600,
              letterSpacing: '0.18em',
              lineHeight: 1.35,
              color: palette.muted,
              marginTop: 6,
              maxWidth: 'min(18vw, 14rem)',
              textAlign: 'center',
            }}
          >
            <span>Tingkat</span>
            <span>Pengadaan</span>
          </div>
        </div>
      </div>
      <div className='flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2'>
        <LegendItem
          color={colorSudah}
          label='Sudah Tercukupi'
          count={safeFulfilled}
          palette={palette}
        />
        <LegendItem
          color={colorBelum}
          label='Belum Tercukupi'
          count={notFulfilled}
          palette={palette}
        />
      </div>
    </div>
  )
}
