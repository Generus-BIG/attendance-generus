import React from 'react'
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

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
}

function DottedBackgroundPattern() {
  return (
    <pattern
      id='highlighted-multi-bar-pattern-dots'
      x='0'
      y='0'
      width='10'
      height='10'
      patternUnits='userSpaceOnUse'
    >
      <circle
        className='dark:text-muted/40 text-muted'
        cx='2'
        cy='2'
        r='1'
        fill='currentColor'
      />
    </pattern>
  )
}

export function HighlightedMultiBar({ data, series, height = 240 }: Props) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return series.reduce<ChartConfig>((acc, s) => {
      acc[s.key] = { label: s.label, color: s.colorToken }
      return acc
    }, {})
  }, [series])

  return (
    <ChartContainer
      config={chartConfig}
      className='w-full'
      style={{ height }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        onMouseLeave={() => setActiveIndex(null)}
        margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
      >
        <rect
          x='0'
          y='0'
          width='100%'
          height='85%'
          fill='url(#highlighted-multi-bar-pattern-dots)'
        />
        <defs>
          <DottedBackgroundPattern />
        </defs>
        <XAxis
          dataKey='label'
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator='dashed' />}
        />
        <ChartLegend content={<ChartLegendContent />} />
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
                className='duration-200'
                fillOpacity={
                  activeIndex === null ? 1 : activeIndex === index ? 1 : 0.3
                }
                stroke={
                  activeIndex === index ? `var(--color-${s.key})` : ''
                }
                onMouseEnter={() => setActiveIndex(index)}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  )
}
