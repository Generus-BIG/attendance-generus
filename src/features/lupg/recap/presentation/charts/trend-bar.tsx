// Generic single-series bar chart with per-bar coloring (highlighted /
// placeholder / default). Series uses palette.chart[0]; highlighted bars use
// palette.chart[1] to keep cross-chart consistency.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { usePresentationAnimation } from '../context/animation-context'
import {
  EditorialTooltipShell,
  hairlineAxisProps,
  RestrainedTopLabel,
  type RestrainedTopLabelProps,
} from './chart-primitives'

export interface TrendBarDatum {
  label: string
  value: number
  isPlaceholder?: boolean
  isHighlighted?: boolean
}

export interface TrendBarProps {
  data: TrendBarDatum[]
  xAxisTitle?: string
  yAxisTitle?: string
  valueDomain?: [number, number]
  valueFormatter?: (n: number) => string
  labelFormatter?: (n: number) => string
}

interface TooltipPayloadEntry {
  value?: number
  payload?: TrendBarDatum
}

interface TipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  labelFormatter?: (n: number) => string
  palette: PresPalette
}

function CustomTooltip({
  active,
  payload,
  label,
  labelFormatter,
  palette,
}: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload
  if (!datum) return null
  const formatted = labelFormatter
    ? labelFormatter(datum.value)
    : String(datum.value)
  return (
    <EditorialTooltipShell title={label ?? ''} palette={palette}>
      <div>Jumlah: {formatted}</div>
    </EditorialTooltipShell>
  )
}

export function TrendBar({
  data,
  xAxisTitle,
  yAxisTitle,
  valueDomain,
  valueFormatter,
  labelFormatter,
}: TrendBarProps) {
  const palette = usePresPalette()
  const { durationScale } = usePresentationAnimation()
  const yAxisWidth = valueFormatter ? 74 : 44
  const axisTitleStyle = {
    fontFamily: palette.fontMono,
    fontSize: 'clamp(0.75rem, 1vw, 1rem)',
    fontWeight: 700,
    letterSpacing: '0.2em',
    fill: palette.muted,
  } as const
  const placeholderFill = `color-mix(in oklch, ${palette.muted} 25%, ${palette.bg})`
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart
        data={data}
        margin={{ top: 46, right: 24, bottom: 36, left: 18 }}
      >
        <CartesianGrid
          strokeDasharray='3 3'
          vertical={false}
          stroke={palette.rule}
        />
        <XAxis
          dataKey='label'
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
          domain={valueDomain}
          tickFormatter={valueFormatter}
          width={yAxisWidth}
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
          cursor={{ fill: palette.muted, fillOpacity: 0.08 }}
          content={(p) => (
            <CustomTooltip
              {...(p as unknown as Omit<
                TipProps,
                'palette' | 'labelFormatter'
              >)}
              labelFormatter={labelFormatter}
              palette={palette}
            />
          )}
        />
        <Bar
          dataKey='value'
          isAnimationActive={true}
          animationDuration={Math.round(800 * durationScale)}
        >
          {data.map((d, idx) => {
            const fill = d.isHighlighted
              ? palette.chart[1]
              : d.isPlaceholder
                ? placeholderFill
                : palette.chart[0]
            return <Cell key={idx} fill={fill} />
          })}
          <LabelList
            dataKey='value'
            content={(p) => (
              <RestrainedTopLabel
                {...(p as Omit<
                  RestrainedTopLabelProps,
                  'palette' | 'formatter'
                >)}
                formatter={labelFormatter}
                hideZero
                palette={palette}
              />
            )}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
