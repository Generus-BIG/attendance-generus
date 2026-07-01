import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { useIsMobile } from '@/hooks/use-mobile'
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

// Stable per-category color so a kategori reads the same hue regardless of
// row sort or which months happen to be empty. Aligned with the broader
// canonical Sensus mapping (GPN A → ACR moves yellow → green) within whatever
// chart ramp the active palette resolves to.
const CATEGORY_COLOR_TOKENS: Record<string, string> = {
  'GPN A': 'var(--chart-1)',
  'GPN B': 'var(--chart-2)',
  AR: 'var(--chart-3)',
  'Anak Remaja': 'var(--chart-3)', // legacy alias for AR
  APR: 'var(--chart-4)',
  ACR: 'var(--chart-5)',
}

const FALLBACK_COLOR = 'var(--chart-1)'

function colorForCategory(name: string): string {
  return CATEGORY_COLOR_TOKENS[name] ?? FALLBACK_COLOR
}

const chartConfig = {
  percentage: { label: 'Persentase', color: FALLBACK_COLOR },
} satisfies ChartConfig

function formatRow(
  row: CategoryBreakdownRow
): { label: string; value: string }[] {
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
    <Card
      className='min-w-0 overflow-hidden border-border/50 shadow-xs'
      data-print-card
    >
      <CardHeader className='px-4 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3'>
        <CardTitle className='text-base font-semibold tracking-tight text-balance sm:text-lg'>
          Persentase Per Kategori
        </CardTitle>
        <CardDescription className='text-xs text-pretty'>
          Tingkat kehadiran rata-rata per kategori sensus.
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 pb-4 sm:px-6 sm:pb-6'>
        {!hasData ? (
          <div className='flex h-60 items-center justify-center text-sm text-muted-foreground'>
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
                      color={colorForCategory(row.category)}
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
                  <Cell
                    key={`cell-${entry.category}`}
                    fill={colorForCategory(entry.category)}
                  />
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
