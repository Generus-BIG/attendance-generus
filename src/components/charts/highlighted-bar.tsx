import React from 'react'
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
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
}

const chartConfig = {
  value: {
    label: 'Jumlah',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function DottedBackgroundPattern() {
  return (
    <pattern
      id='highlighted-bar-pattern-dots'
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

export function HighlightedBar({
  data,
  height = 240,
  orientation = 'vertical',
  valueDomain,
  valueUnit,
  showValueLabel = false,
  categoryWidth = 100,
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

  const valueAxisProps = {
    tick: { fontSize: 11 },
    axisLine: false,
    tickLine: false,
    allowDecimals: false,
    ...(valueDomain ? { domain: valueDomain } : {}),
    ...(valueUnit ? { unit: valueUnit } : {}),
  } as const

  return (
    <ChartContainer
      config={chartConfig}
      className='w-full'
      style={{ height }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        onMouseLeave={() => setActiveIndex(null)}
        margin={{
          top: 20,
          right: isHorizontal ? 32 : 8,
          left: 0,
          bottom: 4,
        }}
      >
        <rect
          x='0'
          y='0'
          width='100%'
          height='85%'
          fill='url(#highlighted-bar-pattern-dots)'
        />
        <defs>
          <DottedBackgroundPattern />
        </defs>
        {isHorizontal ? (
          <>
            <XAxis type='number' width={30} {...valueAxisProps} />
            <YAxis
              type='category'
              width={categoryWidth}
              {...categoryAxisProps}
            />
          </>
        ) : (
          <>
            <XAxis type='category' {...categoryAxisProps} />
            <YAxis type='number' width={30} {...valueAxisProps} />
          </>
        )}
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar
          dataKey='value'
          radius={isHorizontal ? [0, 4, 4, 0] : 4}
          fill='var(--color-value)'
          isAnimationActive={false}
        >
          {data.map((d, index) => {
            const baseFill = d.isPlaceholder
              ? 'var(--muted)'
              : 'var(--color-value)'
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
                  activeIndex === index && !d.isPlaceholder
                    ? 'var(--color-value)'
                    : ''
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
              formatter={(value: unknown) =>
                valueUnit ? `${value}${valueUnit}` : String(value)
              }
            />
          ) : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
