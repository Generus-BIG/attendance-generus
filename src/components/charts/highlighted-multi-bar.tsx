import React from 'react'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  Cell,
  Label,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'

export interface MultiBarRow {
  label: string
  [seriesKey: string]: string | number
}

export interface SeriesDef {
  key: string
  label: string
  colorToken: string
}

interface Props {
  data: MultiBarRow[]
  series: SeriesDef[]
  height?: number
  /** Label under the X axis (e.g. 'Bulan'). */
  xAxisLabel?: string
  /** Label rotated along the Y axis (e.g. 'Persentase (%)'). */
  yAxisLabel?: string
  /** Domain for the numeric Y axis. */
  valueDomain?: [number, number]
  /** Show per-bar value labels. Default: false. */
  showValueLabel?: boolean
  /** Custom formatter for value labels + tooltip. */
  valueFormatter?: (value: number) => string
  /** Custom formatter for Y axis ticks. */
  tickFormatter?: (value: number) => string
  /** Where to place legend. Default: 'top'. */
  legendPosition?: 'top' | 'bottom'
}

export function HighlightedMultiBar({
  data,
  series,
  height = 240,
  xAxisLabel,
  yAxisLabel,
  valueDomain,
  showValueLabel = false,
  valueFormatter,
  tickFormatter,
  legendPosition = 'top',
}: Props) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return series.reduce<ChartConfig>((acc, s) => {
      acc[s.key] = { label: s.label, color: s.colorToken }
      return acc
    }, {})
  }, [series])

  const labelFormatter = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(num)) return String(value ?? '')
    return valueFormatter ? valueFormatter(num) : String(value)
  }

  const yAxisWidth = yAxisLabel ? 48 : 38

  return (
    <ChartContainer config={chartConfig} className='w-full' style={{ height }}>
      <BarChart
        accessibilityLayer
        data={data}
        onMouseLeave={() => setActiveIndex(null)}
        margin={{
          top: showValueLabel ? 32 : 16,
          right: 8,
          left: 4,
          bottom: xAxisLabel ? 20 : 4,
        }}
      >
        <XAxis
          dataKey='label'
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tick={{ fontSize: 11 }}
        >
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
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={yAxisWidth}
          allowDecimals={false}
          domain={valueDomain}
          tickFormatter={tickFormatter}
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
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator='dashed'
              formatter={(value, name, item) => {
                const cfg = chartConfig[item.dataKey as string]
                const label = cfg?.label ?? name
                return (
                  <div className='flex w-full items-center justify-between gap-3 text-xs'>
                    <span className='text-muted-foreground'>{label}</span>
                    <span className='font-mono font-medium tabular-nums'>
                      {labelFormatter(value)}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <ChartLegend
          verticalAlign={legendPosition}
          content={<ChartLegendContent />}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            radius={4}
            isAnimationActive={false}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${s.key}-${index}`}
                className='transition-[fill-opacity,stroke] duration-200'
                fillOpacity={
                  activeIndex === null ? 1 : activeIndex === index ? 1 : 0.3
                }
                stroke={activeIndex === index ? `var(--color-${s.key})` : ''}
                onMouseEnter={() => setActiveIndex(index)}
              />
            ))}
            {showValueLabel ? (
              <LabelList
                dataKey={s.key}
                position='top'
                fontSize={10}
                className='fill-foreground'
                formatter={labelFormatter}
              />
            ) : null}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  )
}
