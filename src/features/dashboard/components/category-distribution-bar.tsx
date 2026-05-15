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
import { useIsMobile } from '@/hooks/use-mobile'
import type { CategoryBreakdownRow } from '../types'
import { ChartSegmentTooltip } from './chart-segment-tooltip'

interface Props {
  data: CategoryBreakdownRow[]
}

const BAR_COLOR = 'var(--chart-1)'

const chartConfig = {
  percentage: { label: 'Persentase', color: BAR_COLOR },
} satisfies ChartConfig

function formatRow(row: CategoryBreakdownRow): { label: string; value: string }[] {
  return [
    { label: 'Hadir', value: row.hadirCount.toLocaleString('id-ID') },
    { label: 'Total Sensus', value: row.totalSensus.toLocaleString('id-ID') },
    { label: 'Persentase', value: `${row.percentage.toFixed(1)}%` },
  ]
}

export function CategoryDistributionBar({ data }: Props) {
  const hasData = data.some((d) => d.hadirCount > 0)
  const isMobile = useIsMobile()

  const chartData = [...data].sort((a, b) => b.percentage - a.percentage)

  return (
    <Card data-print-card>
      <CardHeader className='px-3 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3'>
        <CardTitle className='text-base sm:text-lg'>
          Persentase Per Kategori
        </CardTitle>
        <CardDescription className='hidden sm:block'>
          Tingkat kehadiran rata-rata per kategori sensus.
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 pb-4 sm:px-6 sm:pb-6'>
        {!hasData ? (
          <div className='text-muted-foreground flex h-60 items-center justify-center text-sm'>
            Belum ada data kehadiran bulan ini.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className='w-full'
            style={{ height: isMobile ? 220 : 280 }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 24,
                right: 8,
                left: 0,
                bottom: 4,
              }}
            >
              <XAxis
                dataKey='category'
                type='category'
                tick={{ fontSize: isMobile ? 10 : 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                type='number'
                domain={[0, 100]}
                tick={{ fontSize: isMobile ? 10 : 11 }}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 32 : 40}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', fillOpacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as CategoryBreakdownRow
                  return (
                    <ChartSegmentTooltip
                      label={row.category}
                      color={BAR_COLOR}
                      rows={formatRow(row)}
                    />
                  )
                }}
              />
              <Bar
                dataKey='percentage'
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                maxBarSize={56}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.category}`} fill={BAR_COLOR} />
                ))}
                <LabelList
                  dataKey='percentage'
                  position='top'
                  fontSize={isMobile ? 10 : 11}
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
