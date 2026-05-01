import React from 'react'
import { Cell, LabelList, Pie, PieChart } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

export interface PieDatum {
  label: string
  value: number
  colorToken?: string
}

interface Props {
  data: PieDatum[]
  height?: number
  innerRadius?: number
}

const FALLBACK_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function slugify(raw: string, index: number): string {
  const base = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.length > 0 ? `${base}-${index}` : `slice-${index}`
}

export function HighlightedPie({ data, height = 240, innerRadius = 0 }: Props) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const enriched = React.useMemo(() => {
    return data.map((d, index) => {
      const key = slugify(d.label, index)
      const color = d.colorToken ?? FALLBACK_TOKENS[index % FALLBACK_TOKENS.length]
      return { ...d, key, color }
    })
  }, [data])

  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {
      value: { label: 'Jumlah' },
    }
    for (const item of enriched) {
      config[item.key] = { label: item.label, color: item.color }
    }
    return config
  }, [enriched])

  const chartData = React.useMemo(() => {
    return enriched.map((item) => ({
      label: item.label,
      value: item.value,
      key: item.key,
      fill: `var(--color-${item.key})`,
    }))
  }, [enriched])

  return (
    <ChartContainer
      config={chartConfig}
      className='[&_.recharts-text]:fill-background mx-auto w-full'
      style={{ height }}
    >
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey='label' hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey='value'
          nameKey='label'
          innerRadius={innerRadius}
          cornerRadius={8}
          paddingAngle={4}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {chartData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              className='duration-200'
              fillOpacity={
                activeIndex === null ? 1 : activeIndex === index ? 1 : 0.35
              }
              stroke={
                activeIndex === index ? `var(--color-${chartData[index].key})` : ''
              }
              onMouseEnter={() => setActiveIndex(index)}
            />
          ))}
          <LabelList
            dataKey='value'
            stroke='none'
            fontSize={12}
            fontWeight={500}
            fill='currentColor'
            formatter={(value: unknown) => String(value)}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
