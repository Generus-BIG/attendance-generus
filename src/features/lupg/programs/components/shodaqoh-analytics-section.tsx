import { useMemo } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { useYearlyShodaqohData } from '../../hooks/use-lupg-queries'
import { formatChartValue } from '../../utils/format-chart-value'
import { allMonthKeysForYear, monthNameFromKey } from '../utils/editability'

interface Props {
  kelompokId: string
  year: number
  /** Current month key in 'YYYY-MM' format. Used to mark future months. */
  currentMonthKey: string
}

interface RowData {
  monthKey: string
  monthLabel: string
  shodaqah: number
  jumlahKK: number
  rataRata: number
  isFuture: boolean
  hasData: boolean
}

const chartConfig = {
  shodaqah: {
    label: 'Shodaqah',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function ShodaqohAnalyticsSection({
  kelompokId,
  year,
  currentMonthKey,
}: Props) {
  const { data } = useYearlyShodaqohData(kelompokId, year)

  const rows: RowData[] = useMemo(() => {
    const monthKeys = allMonthKeysForYear(year)
    const reportByMonth = new Map<string, string>()
    for (const r of data?.monthlyReports ?? []) {
      reportByMonth.set(r.month.slice(0, 7), r.id)
    }
    const shodaqohByReport = new Map(
      (data?.shodaqohRows ?? []).map((s) => [s.monthly_report_id, s])
    )

    return monthKeys.map((mk) => {
      const reportId = reportByMonth.get(mk)
      const s = reportId ? shodaqohByReport.get(reportId) : undefined
      const shodaqah = s ? Number(s.nominal) : 0
      const jumlahKK = s ? s.jumlah_kk : 0
      const rataRata = jumlahKK > 0 ? shodaqah / jumlahKK : 0
      const isFuture = mk > currentMonthKey
      const hasData = !!s && (shodaqah > 0 || jumlahKK > 0)
      return {
        monthKey: mk,
        monthLabel: monthNameFromKey(mk),
        shodaqah,
        jumlahKK,
        rataRata,
        isFuture,
        hasData,
      }
    })
  }, [data, year, currentMonthKey])

  const totals = useMemo(() => {
    const tracked = rows.filter((r) => r.hasData)
    const totalShodaqah = tracked.reduce((acc, r) => acc + r.shodaqah, 0)
    const totalKK = tracked.reduce((acc, r) => acc + r.jumlahKK, 0)
    const globalAverage = totalKK > 0 ? totalShodaqah / totalKK : 0
    return { totalShodaqah, totalKK, globalAverage, monthCount: tracked.length }
  }, [rows])

  // Chart only includes months that are not in the future, so the line ends
  // at the current month rather than dropping to 0 for unfilled months ahead.
  const chartData = useMemo(
    () =>
      rows.flatMap((r) =>
        r.isFuture
          ? []
          : [
              {
                label: r.monthLabel.slice(0, 3),
                fullLabel: r.monthLabel,
                shodaqah: r.shodaqah,
                jumlahKK: r.jumlahKK,
                rataRata: r.rataRata,
              },
            ]
      ),
    [rows]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shodaqah PPG</CardTitle>
        <CardDescription>
          Total kontribusi shodaqah dan rata-rata per KK selama tahun {year}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-6 lg:grid-cols-2'>
          {/* Left: Data table */}
          <div className='min-w-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className='text-end'>Shodaqah</TableHead>
                  <TableHead className='text-end'>Jumlah KK</TableHead>
                  <TableHead className='text-end'>Rata-rata/KK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.monthKey}
                    className={
                      r.isFuture
                        ? 'text-muted-foreground/60'
                        : !r.hasData
                          ? 'text-muted-foreground'
                          : undefined
                    }
                  >
                    <TableCell className='font-medium'>
                      {r.monthLabel}
                    </TableCell>
                    <TableCell className='text-end font-mono tabular-nums'>
                      {r.hasData ? formatChartValue(r.shodaqah, 'rupiah') : '-'}
                    </TableCell>
                    <TableCell className='text-end tabular-nums'>
                      {r.hasData ? r.jumlahKK.toLocaleString('id-ID') : '-'}
                    </TableCell>
                    <TableCell className='text-end font-mono tabular-nums'>
                      {r.hasData && r.jumlahKK > 0
                        ? formatChartValue(r.rataRata, 'rupiah')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className='font-semibold'>Total</TableCell>
                  <TableCell className='text-end font-mono font-semibold tabular-nums'>
                    {formatChartValue(totals.totalShodaqah, 'rupiah')}
                  </TableCell>
                  <TableCell className='text-end font-semibold tabular-nums'>
                    {totals.totalKK.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className='text-end font-mono font-semibold tabular-nums'>
                    {totals.globalAverage > 0
                      ? formatChartValue(totals.globalAverage, 'rupiah')
                      : '-'}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Right: Area chart */}
          <div className='flex min-w-0 flex-col gap-2'>
            <div className='text-sm font-semibold'>Tren Shodaqah Bulanan</div>
            <div className='-mx-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              <div className='min-w-70'>
                <ChartContainer
                  config={chartConfig}
                  className='w-full'
                  style={{ height: 280 }}
                >
                  <AreaChart
                    accessibilityLayer
                    data={chartData}
                    margin={{ top: 16, right: 12, left: 4, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id='shodaqah-area-fill'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'
                      >
                        <stop
                          offset='5%'
                          stopColor='var(--color-shodaqah)'
                          stopOpacity={0.4}
                        />
                        <stop
                          offset='95%'
                          stopColor='var(--color-shodaqah)'
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray='3 3'
                      className='stroke-muted'
                    />
                    <XAxis
                      dataKey='label'
                      tickLine={false}
                      tickMargin={8}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(v: number) =>
                        formatChartValue(v, 'rupiah-compact')
                      }
                    />
                    <ChartTooltip
                      cursor={{
                        stroke: 'var(--muted-foreground)',
                        strokeDasharray: '3 3',
                      }}
                      content={<ShodaqohTooltip />}
                    />
                    <Area
                      dataKey='shodaqah'
                      type='monotone'
                      stroke='var(--color-shodaqah)'
                      strokeWidth={2}
                      fill='url(#shodaqah-area-fill)'
                      fillOpacity={1}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface TooltipPayload {
  payload?: {
    fullLabel?: string
    shodaqah?: number
    jumlahKK?: number
    rataRata?: number
  }
}

interface ShodaqohTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

function ShodaqohTooltip({ active, payload }: ShodaqohTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]?.payload
  if (!p) return null
  const shodaqah = p.shodaqah ?? 0
  const jumlahKK = p.jumlahKK ?? 0
  const rataRata = p.rataRata ?? 0
  return (
    <div className='grid min-w-45 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl'>
      <div className='font-medium text-foreground'>{p.fullLabel}</div>
      <div className='grid gap-1'>
        <Row
          label='Total Shodaqah'
          value={formatChartValue(shodaqah, 'rupiah')}
        />
        <Row
          label='Rata-rata/KK'
          value={jumlahKK > 0 ? formatChartValue(rataRata, 'rupiah') : '-'}
        />
        <Row label='Jumlah KK' value={jumlahKK.toLocaleString('id-ID')} />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='font-mono font-medium tabular-nums'>{value}</span>
    </div>
  )
}
