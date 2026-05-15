import { useMemo, useState } from 'react'
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
import type { AbsenceReasonBreakdownRow } from '../types'
import { ChartSegmentTooltip } from './chart-segment-tooltip'

interface Props {
  data: AbsenceReasonBreakdownRow[]
}

const COLOR_BY_REASON: Record<string, string> = {
  Hadir: 'var(--success)',
  Sakit: 'var(--chart-2)',
  Kerja: 'var(--chart-4)',
  Lainnya: 'var(--muted-foreground)',
  Alpa: 'var(--destructive)',
}

const chartConfig = {
  count: { label: 'Jumlah' },
} satisfies ChartConfig

function colorFor(reason: string): string {
  return COLOR_BY_REASON[reason] ?? 'var(--muted-foreground)'
}

function formatRow(row: AbsenceReasonBreakdownRow): { label: string; value: string }[] {
  return [
    { label: 'Jumlah', value: row.count.toLocaleString('id-ID') },
    { label: 'Persentase', value: `${row.percentage.toFixed(1)}%` },
  ]
}

function deriveInsight(data: AbsenceReasonBreakdownRow[]): string | null {
  const hadir = data.find((d) => d.reason === 'Hadir')?.percentage ?? 0
  const alpa = data.find((d) => d.reason === 'Alpa')?.percentage ?? 0
  const izinTotal = data
    .filter((d) => d.reason === 'Sakit' || d.reason === 'Kerja' || d.reason === 'Lainnya')
    .reduce((sum, d) => sum + d.percentage, 0)
  const absencesTotal = alpa + izinTotal
  if (absencesTotal === 0) {
    return hadir >= 75
      ? 'Tingkat kehadiran sangat baik bulan ini.'
      : null
  }
  // Within absences, which dominates?
  if (alpa > izinTotal) {
    return 'Mayoritas absen tanpa keterangan — perlu follow-up komitmen.'
  }
  if (izinTotal > alpa) {
    return 'Mayoritas absen sudah memberi keterangan — cek apakah jadwal kegiatan berbenturan.'
  }
  return null
}

export function AbsenceReasonDonut({ data }: Props) {
  const isMobile = useIsMobile()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const hasData = data.some((d) => d.count > 0)
  const insight = useMemo(() => deriveInsight(data), [data])

  const chartData = data.map((row, index) => ({
    ...row,
    fill: colorFor(row.reason),
    index,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribusi Kehadiran</CardTitle>
        <CardDescription>
          Hadir, izin (Sakit/Kerja/Lainnya), dan Alpa (tanpa keterangan) dari total slot kehadiran.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className='text-muted-foreground flex h-60 items-center justify-center text-sm'>
            Belum ada pertemuan tercatat di bulan ini.
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <ChartContainer
              config={chartConfig}
              className='mx-auto w-full'
              style={{ height: 260 }}
            >
              <PieChart>
                {!isMobile && (
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0].payload as AbsenceReasonBreakdownRow
                      return (
                        <ChartSegmentTooltip
                          label={row.reason}
                          color={colorFor(row.reason)}
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
                  dataKey='count'
                  nameKey='reason'
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  label={(props) => {
                    const { cx, cy, midAngle, innerRadius, outerRadius, percent, payload } = props
                    if (typeof percent !== 'number' || percent < 0.05) return null
                    if (typeof midAngle !== 'number') return null
                    const RADIAN = Math.PI / 180
                    // Mid-band placement: halfway between inner and outer radius.
                    const r =
                      ((innerRadius as number) + (outerRadius as number)) * 0.5
                    const x = (cx as number) + r * Math.cos(-midAngle * RADIAN)
                    const y = (cy as number) + r * Math.sin(-midAngle * RADIAN)
                    // Use the row's pre-computed percentage (matches the tooltip's "Persentase").
                    const pct =
                      typeof (payload as AbsenceReasonBreakdownRow | undefined)?.percentage === 'number'
                        ? (payload as AbsenceReasonBreakdownRow).percentage
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
                      key={`cell-${entry.reason}`}
                      fill={entry.fill}
                      fillOpacity={
                        activeIndex === null || activeIndex === index ? 1 : 0.4
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {isMobile && activeIndex !== null && data[activeIndex] && (
              <button
                type='button'
                onClick={() => setActiveIndex(null)}
                className='flex justify-center'
                aria-label='Tutup info'
              >
                <ChartSegmentTooltip
                  label={data[activeIndex].reason}
                  color={colorFor(data[activeIndex].reason)}
                  rows={formatRow(data[activeIndex])}
                />
              </button>
            )}

            {insight && (
              <p className='text-muted-foreground bg-muted/30 rounded-md px-3 py-2 text-xs'>
                {insight}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
