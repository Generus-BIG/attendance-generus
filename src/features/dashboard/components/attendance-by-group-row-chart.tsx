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
import { Skeleton } from '@/components/ui/skeleton'
import type { GroupGenderBreakdownRow, MonthlyFormRecap } from '../types'
import { ChartSegmentTooltip } from './chart-segment-tooltip'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
}

const CHART_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

// Stable per-kelompok color across renders. We sort the kelompok names
// alphabetically once and assign chart-N by sorted index so the same kelompok
// always gets the same hue, regardless of the row order returned by recap.
function buildGroupColorMap(
  rows: GroupGenderBreakdownRow[]
): Map<string, string> {
  const sorted = [...new Set(rows.map((r) => r.group))].sort((a, b) =>
    a.localeCompare(b, 'id')
  )
  const map = new Map<string, string>()
  sorted.forEach((name, i) => {
    map.set(name, CHART_TOKENS[i % CHART_TOKENS.length])
  })
  return map
}

const chartConfig = {
  percentage: { label: 'Persentase', color: 'var(--chart-1)' },
} satisfies ChartConfig

function formatRow(
  row: GroupGenderBreakdownRow
): { label: string; value: string }[] {
  return [
    { label: 'Hadir Laki-laki', value: row.hadirL.toLocaleString('id-ID') },
    { label: 'Hadir Perempuan', value: row.hadirP.toLocaleString('id-ID') },
    { label: 'Total Hadir', value: row.hadirTotal.toLocaleString('id-ID') },
    { label: 'Total Sensus', value: row.censusTotal.toLocaleString('id-ID') },
    { label: 'Persentase', value: `${row.percentage.toFixed(1)}%` },
  ]
}

export function AttendanceByGroupRowChart({ recap, isLoading }: Props) {
  const data = recap?.byGroupGender ?? []
  const hasData = !isLoading && data.length > 0
  const isMobile = useIsMobile()
  const colorByGroup = buildGroupColorMap(data)
  const colorFor = (group: string) =>
    colorByGroup.get(group) ?? 'var(--chart-1)'

  return (
    <Card data-print-card>
      <CardHeader className='px-4 sm:px-6'>
        <CardTitle className='text-balance'>Persentase Per Kelompok</CardTitle>
        <CardDescription className='text-pretty'>
          Tingkat kehadiran rata-rata per kelompok bulan ini.
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 sm:px-6'>
        {isLoading ? (
          <Skeleton className='h-64 w-full' />
        ) : !hasData ? (
          <div className='flex h-60 items-center justify-center text-sm text-muted-foreground'>
            Belum ada data kelompok bulan ini.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className='w-full'
            style={{
              height: Math.max(200, data.length * (isMobile ? 32 : 40)),
            }}
          >
            <BarChart
              accessibilityLayer
              data={data}
              layout='vertical'
              margin={{
                top: 8,
                right: isMobile ? 36 : 56,
                left: 0,
                bottom: 4,
              }}
            >
              <XAxis
                type='number'
                domain={[0, 100]}
                tick={{ fontSize: isMobile ? 10 : 11 }}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type='category'
                dataKey='group'
                tick={{ fontSize: isMobile ? 10 : 11 }}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 56 : 100}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', fillOpacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as GroupGenderBreakdownRow
                  return (
                    <ChartSegmentTooltip
                      label={row.group}
                      color={colorFor(row.group)}
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
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.group}`}
                    fill={colorFor(entry.group)}
                  />
                ))}
                <LabelList
                  dataKey='percentage'
                  position='right'
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
