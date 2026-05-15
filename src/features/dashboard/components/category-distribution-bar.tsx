import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import type { CategoryBreakdownRow } from '../types'
import { ChartSegmentTooltip } from './chart-segment-tooltip'

interface Props {
  data: CategoryBreakdownRow[]
}

const COLOR_BY_CATEGORY: Record<string, string> = {
  'GPN A': 'var(--chart-1)',
  'GPN B': 'var(--chart-2)',
  AR: 'var(--chart-3)',
  APR: 'var(--chart-4)',
}

const FALLBACK_COLOR = 'var(--muted-foreground)'

const chartConfig = {
  percentage: { label: 'Persentase' },
} satisfies ChartConfig

function colorFor(category: string): string {
  return COLOR_BY_CATEGORY[category] ?? FALLBACK_COLOR
}

function formatRow(row: CategoryBreakdownRow): { label: string; value: string }[] {
  return [
    { label: 'Hadir', value: row.hadirCount.toLocaleString('id-ID') },
    { label: 'Total Sensus', value: row.totalSensus.toLocaleString('id-ID') },
    { label: 'Persentase', value: `${row.percentage.toFixed(1)}%` },
  ]
}

export function CategoryDistributionBar({ data }: Props) {
  const hasData = data.some((d) => d.hadirCount > 0)

  const chartData = [...data]
    .sort((a, b) => b.percentage - a.percentage)
    .map((row) => ({
      ...row,
      fill: colorFor(row.category),
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persentase Per Kategori</CardTitle>
        <CardDescription>
          Tingkat kehadiran rata-rata per kategori sensus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className='text-muted-foreground flex h-60 items-center justify-center text-sm'>
            Belum ada data kehadiran bulan ini.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className='w-full'
            style={{ height: Math.max(200, chartData.length * 48) }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout='vertical'
              margin={{ top: 8, right: 48, left: 4, bottom: 4 }}
            >
              <XAxis
                type='number'
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type='category'
                dataKey='category'
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', fillOpacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as CategoryBreakdownRow
                  return (
                    <ChartSegmentTooltip
                      label={row.category}
                      color={colorFor(row.category)}
                      rows={formatRow(row)}
                    />
                  )
                }}
              />
              <Bar
                dataKey='percentage'
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.category}`} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey='percentage'
                  position='right'
                  fontSize={11}
                  className='fill-foreground'
                  formatter={(v: unknown) => {
                    const num = typeof v === 'number' ? v : Number(v)
                    return Number.isFinite(num) ? `${num.toFixed(0)}%` : ''
                  }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
