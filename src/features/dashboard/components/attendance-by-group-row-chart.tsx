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
import { Skeleton } from '@/components/ui/skeleton'
import type { GroupGenderBreakdownRow, MonthlyFormRecap } from '../types'
import { ChartSegmentTooltip } from './chart-segment-tooltip'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
}

const chartConfig = {
  percentage: { label: 'Persentase', color: 'var(--chart-1)' },
} satisfies ChartConfig

function formatRow(row: GroupGenderBreakdownRow): { label: string; value: string }[] {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persentase Per Kelompok</CardTitle>
        <CardDescription>
          Tingkat kehadiran rata-rata per kelompok bulan ini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className='h-64 w-full' />
        ) : !hasData ? (
          <div className='text-muted-foreground flex h-60 items-center justify-center text-sm'>
            Belum ada data kelompok bulan ini.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className='w-full'
            style={{ height: Math.max(200, data.length * 40) }}
          >
            <BarChart
              accessibilityLayer
              data={data}
              layout='vertical'
              margin={{ top: 8, right: 56, left: 4, bottom: 4 }}
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
                dataKey='group'
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', fillOpacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as GroupGenderBreakdownRow
                  return (
                    <ChartSegmentTooltip
                      label={row.group}
                      color='var(--chart-1)'
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
                  <Cell key={`cell-${entry.group}`} fill='var(--chart-1)' />
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
