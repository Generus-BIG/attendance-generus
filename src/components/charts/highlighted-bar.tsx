import React from 'react'
import { Bar, BarChart, Cell, Label, LabelList, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

export interface BarDatum {
  label: string
  value: number
  isPlaceholder?: boolean
  /**
   * Optional palette-aware color for this bar.
   * 0 → var(--chart-1), 1 → var(--chart-2), … 4 → var(--chart-5).
   * Higher indexes wrap modulo 5. Leave undefined to use the default series fill.
   */
  colorIndex?: number
}

const CHART_TOKEN_COUNT = 5

function chartTokenAt(index: number): string {
  const slot =
    ((index % CHART_TOKEN_COUNT) + CHART_TOKEN_COUNT) % CHART_TOKEN_COUNT
  return `var(--chart-${slot + 1})`
}

interface Props {
  data: BarDatum[]
  height?: number
  orientation?: 'vertical' | 'horizontal'
  /** Domain for the numeric axis (e.g. [0, 100] for percentages). */
  valueDomain?: [number, number]
  /** Unit appended to axis ticks and labels (e.g. '%'). */
  valueUnit?: string
  /** Show value as LabelList on each bar. Default: false. */
  showValueLabel?: boolean
  /** Width reserved for the category axis when orientation='horizontal'. */
  categoryWidth?: number
  /** Label under the X axis (e.g. 'Bulan'). */
  xAxisLabel?: string
  /** Label rotated along the Y axis (e.g. 'Persentase (%)'). */
  yAxisLabel?: string
  /** Custom formatter for value labels + tooltip (overrides valueUnit formatting). */
  valueFormatter?: (value: number) => string
  /** Custom formatter for value axis ticks. */
  tickFormatter?: (value: number) => string
  /** Width reserved for the value axis. Default: 30 for vertical, 40 with yAxisLabel. */
  valueAxisWidth?: number
}

const chartConfig = {
  value: {
    label: 'Jumlah',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function HighlightedBar({
  data,
  height = 240,
  orientation = 'vertical',
  valueDomain,
  valueUnit,
  showValueLabel = false,
  categoryWidth = 100,
  xAxisLabel,
  yAxisLabel,
  valueFormatter,
  tickFormatter,
  valueAxisWidth,
}: Props) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const isHorizontal = orientation === 'horizontal'

  const categoryAxisProps = {
    dataKey: 'label',
    tickLine: false,
    tickMargin: 10,
    axisLine: false,
    tick: { fontSize: 11 },
  } as const

  const resolvedValueAxisWidth =
    valueAxisWidth ?? (yAxisLabel && !isHorizontal ? 48 : 30)

  const valueAxisProps = {
    tick: { fontSize: 11 },
    axisLine: false,
    tickLine: false,
    allowDecimals: false,
    ...(valueDomain ? { domain: valueDomain } : {}),
    ...(valueUnit && !tickFormatter ? { unit: valueUnit } : {}),
    ...(tickFormatter ? { tickFormatter } : {}),
  } as const

  const labelFormatter = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value)
    if (valueFormatter) return valueFormatter(num)
    return valueUnit ? `${value}${valueUnit}` : String(value)
  }

  return (
    <ChartContainer config={chartConfig} className='w-full' style={{ height }}>
      <BarChart
        accessibilityLayer
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        onMouseLeave={() => setActiveIndex(null)}
        margin={{
          top: 20,
          right: isHorizontal ? 32 : 8,
          left: yAxisLabel && !isHorizontal ? 8 : 0,
          bottom: xAxisLabel ? 20 : 4,
        }}
      >
        {isHorizontal ? (
          <>
            <XAxis
              type='number'
              width={resolvedValueAxisWidth}
              {...valueAxisProps}
            >
              {yAxisLabel ? (
                <Label
                  value={yAxisLabel}
                  position='insideBottom'
                  offset={-4}
                  className='fill-muted-foreground text-[11px]'
                />
              ) : null}
            </XAxis>
            <YAxis type='category' width={categoryWidth} {...categoryAxisProps}>
              {xAxisLabel ? (
                <Label
                  value={xAxisLabel}
                  angle={-90}
                  position='insideLeft'
                  className='fill-muted-foreground text-[11px]'
                />
              ) : null}
            </YAxis>
          </>
        ) : (
          <>
            <XAxis type='category' {...categoryAxisProps}>
              {xAxisLabel ? (
                <Label
                  value={xAxisLabel}
                  position='insideBottom'
                  offset={-6}
                  className='fill-muted-foreground text-[11px]'
                />
              ) : null}
            </XAxis>
            <YAxis
              type='number'
              width={resolvedValueAxisWidth}
              {...valueAxisProps}
            >
              {yAxisLabel ? (
                <Label
                  value={yAxisLabel}
                  angle={-90}
                  position='insideLeft'
                  offset={10}
                  className='fill-muted-foreground text-[11px]'
                  style={{ textAnchor: 'middle' }}
                />
              ) : null}
            </YAxis>
          </>
        )}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => labelFormatter(value)}
            />
          }
        />
        <Bar
          dataKey='value'
          radius={isHorizontal ? [0, 4, 4, 0] : 4}
          fill='var(--color-value)'
          isAnimationActive={false}
        >
          {data.map((d, index) => {
            const seriesFill =
              d.colorIndex != null
                ? chartTokenAt(d.colorIndex)
                : 'var(--color-value)'
            const baseFill = d.isPlaceholder ? 'var(--muted)' : seriesFill
            const placeholderOpacity = 0.4
            const activeOpacity =
              activeIndex === null ? 1 : activeIndex === index ? 1 : 0.3
            const opacity = d.isPlaceholder
              ? Math.min(placeholderOpacity, activeOpacity)
              : activeOpacity
            return (
              <Cell
                key={`cell-${index}`}
                className='duration-200'
                fill={baseFill}
                fillOpacity={opacity}
                stroke={
                  activeIndex === index && !d.isPlaceholder ? seriesFill : ''
                }
                onMouseEnter={() => setActiveIndex(index)}
              />
            )
          })}
          {showValueLabel ? (
            <LabelList
              dataKey='value'
              position={isHorizontal ? 'right' : 'top'}
              fontSize={11}
              className='fill-foreground'
              formatter={labelFormatter}
            />
          ) : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
