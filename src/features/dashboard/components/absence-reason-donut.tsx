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
import { PIE_LABEL_MIN_FRACTION } from '../constants'
import type { AbsenceReasonBreakdownRow } from '../types'
import { ChartSegmentTooltip } from './chart-segment-tooltip'

interface Props {
  data: AbsenceReasonBreakdownRow[]
}

// Three top-level outcome buckets — traffic-light readability at a glance.
// Sub-categories of Izin (Sakit/Kerja/Lainnya) surface in the Izin tooltip
// rather than as their own slices, since visually 5 thin slices were noisy
// and the L1 question is "did they show up, did they have a reason, or were
// they absent without explanation."
type SliceReason = 'Hadir' | 'Izin' | 'Alpa'

type IzinBreakdown = {
  reason: 'Sakit' | 'Kerja' | 'Lainnya'
  count: number
  percentage: number
}

type DonutSlice = {
  reason: SliceReason
  count: number
  percentage: number
  fill: string
  index: number
  izinBreakdown?: IzinBreakdown[]
}

const COLOR_BY_SLICE: Record<SliceReason, string> = {
  Hadir: 'var(--success)',
  Izin: 'var(--warning)',
  Alpa: 'var(--destructive)',
}

const chartConfig = {
  count: { label: 'Jumlah' },
} satisfies ChartConfig

function formatSliceRows(slice: DonutSlice): { label: string; value: string }[] {
  if (slice.reason === 'Izin' && slice.izinBreakdown) {
    // Izin tooltip shows total + per-reason breakdown, count + percentage on
    // a single line each (e.g. "Sakit  5 (12.0%)").
    const rows: { label: string; value: string }[] = [
      {
        label: 'Total',
        value: `${slice.count.toLocaleString('id-ID')} (${slice.percentage.toFixed(1)}%)`,
      },
    ]
    for (const sub of slice.izinBreakdown) {
      rows.push({
        label: sub.reason,
        value: `${sub.count.toLocaleString('id-ID')} (${sub.percentage.toFixed(1)}%)`,
      })
    }
    return rows
  }
  return [
    { label: 'Jumlah', value: slice.count.toLocaleString('id-ID') },
    { label: 'Persentase', value: `${slice.percentage.toFixed(1)}%` },
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

  // Collapse the 5-row breakdown (Hadir, Sakit, Kerja, Lainnya, Alpa) into
  // 3 chart slices. Izin folds the three permission reasons together.
  const slices: DonutSlice[] = useMemo(() => {
    const out: DonutSlice[] = []
    const hadirRow = data.find((d) => d.reason === 'Hadir')
    const alpaRow = data.find((d) => d.reason === 'Alpa')
    const izinRows = data.filter(
      (d) => d.reason === 'Sakit' || d.reason === 'Kerja' || d.reason === 'Lainnya'
    )

    let idx = 0
    if (hadirRow) {
      out.push({
        reason: 'Hadir',
        count: hadirRow.count,
        percentage: hadirRow.percentage,
        fill: COLOR_BY_SLICE.Hadir,
        index: idx++,
      })
    }
    if (izinRows.length > 0) {
      const izinCount = izinRows.reduce((sum, r) => sum + r.count, 0)
      const izinPct = izinRows.reduce((sum, r) => sum + r.percentage, 0)
      out.push({
        reason: 'Izin',
        count: izinCount,
        percentage: izinPct,
        fill: COLOR_BY_SLICE.Izin,
        index: idx++,
        izinBreakdown: izinRows.map((r) => ({
          reason: r.reason as 'Sakit' | 'Kerja' | 'Lainnya',
          count: r.count,
          percentage: r.percentage,
        })),
      })
    }
    if (alpaRow) {
      out.push({
        reason: 'Alpa',
        count: alpaRow.count,
        percentage: alpaRow.percentage,
        fill: COLOR_BY_SLICE.Alpa,
        index: idx++,
      })
    }
    return out
  }, [data])

  return (
    <Card data-print-card>
      <CardHeader>
        <CardTitle>Distribusi Kehadiran</CardTitle>
        <CardDescription>
          Hadir, Izin, dan Alpa dari total slot kehadiran. Hover/tap Izin untuk rincian Sakit/Kerja/Lainnya.
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
                      const slice = payload[0].payload as DonutSlice
                      return (
                        <ChartSegmentTooltip
                          label={slice.reason}
                          color={slice.fill}
                          rows={formatSliceRows(slice)}
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
                  data={slices}
                  dataKey='count'
                  nameKey='reason'
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  label={(props) => {
                    const { cx, cy, midAngle, innerRadius, outerRadius, percent, payload } = props
                    if (typeof percent !== 'number' || percent < PIE_LABEL_MIN_FRACTION) return null
                    if (typeof midAngle !== 'number') return null
                    const RADIAN = Math.PI / 180
                    const r =
                      ((innerRadius as number) + (outerRadius as number)) * 0.5
                    const x = (cx as number) + r * Math.cos(-midAngle * RADIAN)
                    const y = (cy as number) + r * Math.sin(-midAngle * RADIAN)
                    const pct =
                      typeof (payload as DonutSlice | undefined)?.percentage === 'number'
                        ? (payload as DonutSlice).percentage
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
                  {slices.map((entry, index) => (
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

            {isMobile && activeIndex !== null && slices[activeIndex] && (
              <button
                type='button'
                onClick={() => setActiveIndex(null)}
                className='flex justify-center'
                aria-label='Tutup info'
              >
                <ChartSegmentTooltip
                  label={slices[activeIndex].reason}
                  color={slices[activeIndex].fill}
                  rows={formatSliceRows(slices[activeIndex])}
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
