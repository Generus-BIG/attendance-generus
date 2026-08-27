import { useState } from 'react'
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
import { Cell, Legend, Pie, PieChart } from 'recharts'
import { PIE_LABEL_MIN_FRACTION } from '../constants'
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

// Row augmented with `sharePct`: Hadir share within total Hadir, summing to
// 100% across genders. This is the metric the chart visualizes (slice size
// is proportional to hadirCount), so label + tooltip should both surface it.
// `percentage` (the attendance rate vs sensus) is intentionally not shown
// here — that comparison belongs in the rate-oriented widgets.
type GenderChartRow = GenderBreakdownRow & {
  label: string
  fill: string
  index: number
  sharePct: number
}

function formatRow(row: GenderChartRow): { label: string; value: string }[] {
  return [
    { label: 'Hadir', value: row.hadirCount.toLocaleString('id-ID') },
    { label: 'Persentase', value: `${row.sharePct.toFixed(1)}%` },
  ]
}

export function GenderDistributionPie({ data }: Props) {
  const isMobile = useIsMobile()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const hasData = data.some((d) => d.hadirCount > 0)

  const totalHadir = data.reduce((sum, r) => sum + r.hadirCount, 0)

  const chartData: GenderChartRow[] = data.map((row, index) => ({
    ...row,
    label: LABEL_BY_GENDER[row.gender] ?? row.gender,
    fill: colorFor(row.gender),
    index,
    sharePct: totalHadir > 0 ? (row.hadirCount / totalHadir) * 100 : 0,
  }))

  return (
    <Card
      className='min-w-0 overflow-hidden border-border/50 shadow-xs'
      data-print-card
    >
      <CardHeader className='px-4 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3'>
        <CardTitle className='text-base font-semibold tracking-tight text-balance sm:text-lg'>
          Distribusi Gender
        </CardTitle>
        <CardDescription className='text-xs text-pretty'>
          Rasio kehadiran Laki-laki dan Perempuan.
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 pb-4 sm:px-6 sm:pb-6'>
        {!hasData ? (
          <div className='flex h-60 items-center justify-center text-sm text-muted-foreground'>
            Belum ada data kehadiran bulan ini.
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            <ChartContainer
              config={chartConfig}
              className='mx-auto w-full'
              style={{ height: isMobile ? 180 : 240 }}
            >
              <PieChart>
                {!isMobile && (
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0].payload as GenderChartRow
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
                  iconSize={isMobile ? 6 : 8}
                  wrapperStyle={{
                    fontSize: isMobile ? 10 : 11,
                    paddingTop: isMobile ? 4 : 8,
                  }}
                />
                <Pie
                  data={chartData}
                  dataKey='hadirCount'
                  nameKey='label'
                  innerRadius={isMobile ? 36 : 60}
                  outerRadius={isMobile ? 60 : 100}
                  paddingAngle={2}
                  label={(props) => {
                    const {
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                      payload,
                    } = props
                    if (
                      typeof percent !== 'number' ||
                      percent < PIE_LABEL_MIN_FRACTION
                    )
                      return null
                    if (typeof midAngle !== 'number') return null
                    const RADIAN = Math.PI / 180
                    const r =
                      ((innerRadius as number) + (outerRadius as number)) * 0.5
                    const x = (cx as number) + r * Math.cos(-midAngle * RADIAN)
                    const y = (cy as number) + r * Math.sin(-midAngle * RADIAN)
                    // sharePct = hadirCount / totalHadir × 100, summing to 100%
                    // across genders. Matches the slice size by design.
                    const pct =
                      typeof (payload as GenderChartRow | undefined)
                        ?.sharePct === 'number'
                        ? (payload as GenderChartRow).sharePct
                        : percent * 100
                    return (
                      <text
                        x={x}
                        y={y}
                        fill='var(--foreground)'
                        textAnchor='middle'
                        dominantBaseline='central'
                        fontSize={isMobile ? 9 : 11}
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
