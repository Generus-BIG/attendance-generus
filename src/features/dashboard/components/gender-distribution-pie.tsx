import { useState } from 'react'
import { Cell, Legend, Pie, PieChart } from 'recharts'
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
import type { GenderBreakdownRow } from '../types'
import { ChartSegmentTooltip } from './chart-segment-tooltip'

interface Props {
  data: GenderBreakdownRow[]
}

const COLOR_BY_GENDER: Record<string, string> = {
  L: 'var(--chart-1)',
  P: 'var(--chart-3)',
  Unknown: 'var(--muted-foreground)',
}

const LABEL_BY_GENDER: Record<string, string> = {
  L: 'Laki-laki',
  P: 'Perempuan',
  Unknown: 'Tidak diketahui',
}

const chartConfig = {
  hadirCount: { label: 'Hadir' },
} satisfies ChartConfig

function colorFor(gender: string): string {
  return COLOR_BY_GENDER[gender] ?? 'var(--muted-foreground)'
}

function formatRow(row: GenderBreakdownRow): { label: string; value: string }[] {
  return [
    { label: 'Hadir', value: row.hadirCount.toLocaleString('id-ID') },
    { label: 'Total Sensus', value: row.totalSensus.toLocaleString('id-ID') },
    { label: 'Persentase', value: `${row.percentage.toFixed(1)}%` },
  ]
}

export function GenderDistributionPie({ data }: Props) {
  const isMobile = useIsMobile()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const hasData = data.some((d) => d.hadirCount > 0)

  const chartData = data.map((row, index) => ({
    ...row,
    label: LABEL_BY_GENDER[row.gender] ?? row.gender,
    fill: colorFor(row.gender),
    index,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribusi Gender</CardTitle>
        <CardDescription>
          Rasio kehadiran Laki-laki dan Perempuan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className='text-muted-foreground flex h-60 items-center justify-center text-sm'>
            Belum ada data kehadiran bulan ini.
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            <ChartContainer
              config={chartConfig}
              className='mx-auto w-full'
              style={{ height: 240 }}
            >
              <PieChart>
                {!isMobile && (
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0].payload as GenderBreakdownRow & {
                        label: string
                      }
                      return (
                        <ChartSegmentTooltip
                          label={row.label}
                          color={colorFor(row.gender)}
                          rows={formatRow(row)}
                        />
                      )
                    }}
                  />
                )}
                <Legend
                  verticalAlign='bottom'
                  iconType='circle'
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <Pie
                  data={chartData}
                  dataKey='hadirCount'
                  nameKey='label'
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={(props) => {
                    const { cx, cy, midAngle, innerRadius, outerRadius, percent, payload } = props
                    if (typeof percent !== 'number' || percent < 0.05) return null
                    if (typeof midAngle !== 'number') return null
                    const RADIAN = Math.PI / 180
                    const r =
                      ((innerRadius as number) + (outerRadius as number)) * 0.5
                    const x = (cx as number) + r * Math.cos(-midAngle * RADIAN)
                    const y = (cy as number) + r * Math.sin(-midAngle * RADIAN)
                    const pct =
                      typeof (payload as GenderBreakdownRow | undefined)?.percentage === 'number'
                        ? (payload as GenderBreakdownRow).percentage
                        : percent * 100
                    return (
                      <text
                        x={x}
                        y={y}
                        fill='var(--foreground)'
                        textAnchor='middle'
                        dominantBaseline='central'
                        fontSize={11}
                        fontWeight={600}
                      >
                        {`${pct.toFixed(0)}%`}
                      </text>
                    )
                  }}
                  labelLine={false}
                  onClick={
                    isMobile
                      ? (_, idx) =>
                          setActiveIndex((curr) => (curr === idx ? null : idx))
                      : undefined
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.gender}`}
                      fill={entry.fill}
                      fillOpacity={
                        activeIndex === null || activeIndex === index ? 1 : 0.4
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {isMobile && activeIndex !== null && chartData[activeIndex] && (
              <button
                type='button'
                onClick={() => setActiveIndex(null)}
                className='flex justify-center'
                aria-label='Tutup info'
              >
                <ChartSegmentTooltip
                  label={chartData[activeIndex].label}
                  color={colorFor(chartData[activeIndex].gender)}
                  rows={formatRow(chartData[activeIndex])}
                />
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
