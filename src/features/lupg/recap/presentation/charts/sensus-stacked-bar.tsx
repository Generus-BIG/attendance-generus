// Sensus stacked bar chart (desa mode) — one stacked bar per kelompok, 5
// generus categories.
//
// CANONICAL PALETTE EXCEPTION: This chart and `sensus-pie.tsx` use a fixed
// 5-color ramp (yellow → light-green → green → dark-green → darkest-green for
// ACR → GPN_B) imported from `../theme`. The colors encode content meaning
// (kategori) consistent across slides. They intentionally do NOT swap with
// the active palette ramp. See spec section 2.4 / Design Principle 2 in
// .impeccable.md.
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EditorialTooltipShell, hairlineAxisProps } from './chart-primitives'
import { SENSUS_CATEGORY_COLORS, SENSUS_STACK_ORDER } from '../theme'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { usePresentationAnimation } from '../context/animation-context'

type GenerusCode = 'GPN_A' | 'GPN_B' | 'AR' | 'APR' | 'ACR'

export interface SensusStackedBarDatum {
  kelompok: string
  GPN_A: number
  GPN_B: number
  AR: number
  APR: number
  ACR: number
  total: number
}

export interface SensusStackedBarProps {
  data: SensusStackedBarDatum[]
}

const CATEGORY_LABELS: Record<GenerusCode, string> = {
  GPN_A: 'GPN A',
  GPN_B: 'GPN B',
  AR: 'AR',
  APR: 'APR',
  ACR: 'ACR',
}

function niceCeil(value: number, step: number): number {
  if (value <= 0) return step
  return Math.ceil(value / step) * step
}

function buildTicks(maxValue: number, step: number): number[] {
  const top = niceCeil(Math.max(maxValue, step), step)
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return ticks
}

interface TooltipPayloadEntry {
  payload?: SensusStackedBarDatum
}

interface TipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  palette: PresPalette
}

function CustomTooltip({ active, payload, label, palette }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload
  if (!datum) return null
  const total = datum.total
  return (
    <EditorialTooltipShell title={label ?? ''} palette={palette}>
      {SENSUS_STACK_ORDER.map((code) => {
        const value = datum[code]
        const pct = total > 0 ? (value / total) * 100 : 0
        return (
          <div key={code}>
            {CATEGORY_LABELS[code]}: {value} ({pct.toFixed(0)}%)
          </div>
        )
      })}
      <div style={{ marginTop: 4, fontWeight: 700 }}>Total: {total}</div>
    </EditorialTooltipShell>
  )
}

interface InsideLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  value?: number | string
  palette: PresPalette
}

function InsideSegmentLabel(props: InsideLabelProps) {
  const heightNum = typeof props.height === 'number' ? props.height : Number(props.height)
  const widthNum = typeof props.width === 'number' ? props.width : Number(props.width)
  const xNum = typeof props.x === 'number' ? props.x : Number(props.x)
  const yNum = typeof props.y === 'number' ? props.y : Number(props.y)
  const valueNum =
    typeof props.value === 'number' ? props.value : Number(props.value)
  if (!Number.isFinite(heightNum) || heightNum < 12) return null
  if (!Number.isFinite(valueNum) || valueNum === 0) return null
  return (
    <text
      x={xNum + widthNum / 2}
      y={yNum + heightNum / 2}
      textAnchor='middle'
      dominantBaseline='central'
      style={{
        fontFamily: props.palette.fontMono,
        fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
        fontWeight: 700,
        fill: '#ffffff',
      }}
    >
      {valueNum}
    </text>
  )
}

interface TopTotalLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  index?: number
  data: SensusStackedBarDatum[]
  palette: PresPalette
}

function TopTotalLabel(props: TopTotalLabelProps) {
  const xNum = typeof props.x === 'number' ? props.x : Number(props.x)
  const yNum = typeof props.y === 'number' ? props.y : Number(props.y)
  const widthNum = typeof props.width === 'number' ? props.width : Number(props.width)
  const idx = typeof props.index === 'number' ? props.index : -1
  if (idx < 0 || idx >= props.data.length) return null
  if (!Number.isFinite(xNum) || !Number.isFinite(yNum) || !Number.isFinite(widthNum)) {
    return null
  }
  const total = props.data[idx].total
  if (total === 0) return null
  return (
    <text
      x={xNum + widthNum / 2}
      y={yNum - 6}
      textAnchor='middle'
      style={{
        fontFamily: props.palette.fontMono,
        fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
        fontWeight: 700,
        fill: props.palette.ink,
      }}
    >
      {total}
    </text>
  )
}

interface LegendPayloadEntry {
  value?: string
  color?: string
}

interface CustomLegendProps {
  payload?: LegendPayloadEntry[]
  palette: PresPalette
}

function CustomLegend({ payload, palette }: CustomLegendProps) {
  if (!payload) return null
  return (
    <div className='flex flex-wrap items-center justify-center gap-4 pt-2'>
      {payload.map((entry) => (
        <div key={entry.value} className='flex items-center gap-2'>
          <span
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: entry.color,
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
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SensusStackedBar({ data }: SensusStackedBarProps) {
  const palette = usePresPalette()
  const { durationScale } = usePresentationAnimation()
  const grandTotal = data.reduce((a, b) => a + b.total, 0)
  if (grandTotal === 0) {
    return (
      <div
        className='flex h-full w-full items-center justify-center'
        style={{
          fontFamily: palette.fontSans,
          fontSize: 'clamp(1rem, 1.4vw, 1.5rem)',
          color: palette.muted,
        }}
      >
        Belum ada data sensus
      </div>
    )
  }
  const maxTotal = data.reduce((a, b) => Math.max(a, b.total), 0)
  const ticks = buildTicks(maxTotal, 10)
  const yMax = ticks[ticks.length - 1]
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart
        data={data}
        margin={{ top: 28, right: 24, bottom: 36, left: 36 }}
      >
        <CartesianGrid
          strokeDasharray='3 3'
          vertical={false}
          stroke={palette.rule}
        />
        <XAxis dataKey='kelompok' interval={0} {...hairlineAxisProps(palette, 'x')} />
        <YAxis ticks={ticks} domain={[0, yMax]} {...hairlineAxisProps(palette, 'y')} />
        <Tooltip
          cursor={{ fill: palette.muted, fillOpacity: 0.08 }}
          content={(p) => (
            <CustomTooltip
              {...(p as unknown as Omit<TipProps, 'palette'>)}
              palette={palette}
            />
          )}
        />
        <Legend
          content={(p) => (
            <CustomLegend
              {...(p as unknown as Omit<CustomLegendProps, 'palette'>)}
              palette={palette}
            />
          )}
          verticalAlign='bottom'
        />
        {SENSUS_STACK_ORDER.map((code, idx) => {
          const isTop = idx === SENSUS_STACK_ORDER.length - 1
          return (
            <Bar
              key={code}
              stackId='g'
              dataKey={code}
              name={CATEGORY_LABELS[code]}
              fill={SENSUS_CATEGORY_COLORS[code]}
              isAnimationActive={true}
              animationDuration={Math.round(800 * durationScale)}
            >
              <LabelList
                dataKey={code}
                content={(p) => (
                  <InsideSegmentLabel
                    {...(p as unknown as Omit<InsideLabelProps, 'palette'>)}
                    palette={palette}
                  />
                )}
              />
              {isTop ? (
                <LabelList
                  content={(p) => (
                    <TopTotalLabel
                      {...(p as unknown as Omit<TopTotalLabelProps, 'data' | 'palette'>)}
                      data={data}
                      palette={palette}
                    />
                  )}
                />
              ) : null}
            </Bar>
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}
