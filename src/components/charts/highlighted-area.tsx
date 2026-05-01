import React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

export interface AreaRow {
  label: string
  [seriesKey: string]: string | number
}

export interface AreaSeriesDef {
  key: string
  label: string
  colorToken: string
}

interface Props {
  data: AreaRow[]
  series: AreaSeriesDef[]
  height?: number
}

export function HighlightedArea({ data, series, height = 240 }: Props) {
  const gradientIdPrefix = React.useId().replace(/:/g, '')

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
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
      >
        <defs>
          {series.map((s) => {
            const id = `${gradientIdPrefix}-${s.key}`
            return (
              <linearGradient
                key={id}
                id={id}
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='5%'
                  stopColor={`var(--color-${s.key})`}
                  stopOpacity={0.35}
                />
                <stop
                  offset='95%'
                  stopColor={`var(--color-${s.key})`}
                  stopOpacity={0}
                />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray='3 3'
          className='stroke-muted'
        />
        <XAxis
          dataKey='label'
          tickLine={false}
          tickMargin={8}
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
          cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
          content={<ChartTooltipContent indicator='dot' />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((s) => {
          const id = `${gradientIdPrefix}-${s.key}`
          return (
            <Area
              key={s.key}
              dataKey={s.key}
              type='monotone'
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              fill={`url(#${id})`}
              fillOpacity={1}
              isAnimationActive={false}
              stackId={undefined}
            />
          )
        })}
      </AreaChart>
    </ChartContainer>
  )
}
