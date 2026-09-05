// Sarpras bar (desa mode) — fulfilled count per kelompok with % label on top.
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
import { EditorialTooltipShell, hairlineAxisProps } from './chart-primitives'

export interface SarprasStackedBarDatum {
  kelompok: string
  sudah: number
  belum: number
}

export interface SarprasStackedBarProps {
  data: SarprasStackedBarDatum[]
  totalItems: number
}

interface TooltipPayloadEntry {
  payload?: SarprasStackedBarDatum
}

interface TipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  totalItems: number
  palette: PresPalette
}

function CustomTooltip({
  active,
  payload,
  label,
  totalItems,
  palette,
}: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload
  if (!datum) return null
  const pct = totalItems > 0 ? Math.round((datum.sudah / totalItems) * 100) : 0
  return (
    <EditorialTooltipShell title={label ?? ''} palette={palette}>
      <div>Sudah: {datum.sudah}</div>
      <div>Belum: {datum.belum}</div>
      <div>Persentase: {pct}%</div>
    </EditorialTooltipShell>
  )
}

interface TopPctLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  index?: number
  data: SarprasStackedBarDatum[]
  totalItems: number
  palette: PresPalette
}

function TopPctLabel({
  x,
  y,
  width,
  index,
  data,
  totalItems,
  palette,
}: TopPctLabelProps) {
  const xNum = typeof x === 'number' ? x : Number(x)
  const yNum = typeof y === 'number' ? y : Number(y)
  const widthNum = typeof width === 'number' ? width : Number(width)
  const idx = typeof index === 'number' ? index : -1
  if (idx < 0 || idx >= data.length) return null
  if (
    !Number.isFinite(xNum) ||
    !Number.isFinite(yNum) ||
    !Number.isFinite(widthNum)
  ) {
    return null
  }
  const pct =
    totalItems > 0 ? Math.round((data[idx].sudah / totalItems) * 100) : 0
  return (
    <text
      x={xNum + widthNum / 2}
      y={yNum - 6}
      textAnchor='middle'
      style={{
        fontFamily: palette.fontMono,
        fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
        fontWeight: 700,
        fill: palette.ink,
      }}
    >
      {pct}%
    </text>
  )
}

export function SarprasStackedBar({
  data,
  totalItems,
}: SarprasStackedBarProps) {
  const palette = usePresPalette()
  const { durationScale } = usePresentationAnimation()
  const colorSudah = palette.sarprasPrimary
  if (totalItems <= 0 || data.length === 0) {
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
        <XAxis
          dataKey='kelompok'
          interval={0}
          {...hairlineAxisProps(palette, 'x')}
        />
        <YAxis
          domain={[0, totalItems]}
          allowDecimals={false}
          {...hairlineAxisProps(palette, 'y')}
        />
        <Tooltip
          cursor={{ fill: palette.muted, fillOpacity: 0.08 }}
          content={(p) => (
            <CustomTooltip
              {...(p as unknown as Omit<TipProps, 'totalItems' | 'palette'>)}
              totalItems={totalItems}
              palette={palette}
            />
          )}
        />
        <Bar
          dataKey='sudah'
          fill={colorSudah}
          radius={[7, 7, 0, 0]}
          isAnimationActive={true}
          animationDuration={Math.round(800 * durationScale)}
        >
          <LabelList
            content={(p) => (
              <TopPctLabel
                {...(p as Omit<
                  TopPctLabelProps,
                  'data' | 'totalItems' | 'palette'
                >)}
                data={data}
                totalItems={totalItems}
                palette={palette}
              />
            )}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
