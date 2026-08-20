import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  HighlightedMultiBar,
  type MultiBarRow,
  type SeriesDef,
} from '@/components/charts/highlighted-multi-bar'
import { MonthSelectionChips } from '../../components/month-selection-chips'
import {
  allMonthKeysForYear,
  monthNameFromKey,
} from '../../programs/utils/editability'
import { type MetricReportRow, type MonthlyReportRow } from '../../types'
import {
  formatChartValue,
  makeAxisFormatter,
} from '../../utils/format-chart-value'

interface Props {
  year: number
  currentMonthKey: string
  monthlyReports: MonthlyReportRow[]
  metricReports: MetricReportRow[]
}

interface CategoryChart {
  key: string
  title: string
  description: string
  series: SeriesDef[]
}

// Pair each Kehadiran series with its Piket counterpart so the chart renders
// two bars per month. GPN is rendered as a single combined chart with four
// bars per month (A / B × Kehadiran / Piket) — that's how the reference mock
// lays it out.
const CATEGORY_CHARTS: CategoryChart[] = [
  {
    key: 'ACR',
    title: 'ACR',
    description: 'Kehadiran ACR vs Piket LUPG ACR per bulan.',
    series: [
      { key: 'ATT_PCT_ACR', label: 'ACR', colorToken: 'var(--chart-1)' },
      {
        key: 'ATT_PCT_PIKET_ACR',
        label: 'Piket LUPG ACR',
        colorToken: 'var(--chart-2)',
      },
    ],
  },
  {
    key: 'APR',
    title: 'APR',
    description: 'Kehadiran APR vs Piket LUPG APR per bulan.',
    series: [
      { key: 'ATT_PCT_APR', label: 'APR', colorToken: 'var(--chart-3)' },
      {
        key: 'ATT_PCT_PIKET_APR',
        label: 'Piket LUPG APR',
        colorToken: 'var(--chart-4)',
      },
    ],
  },
  {
    key: 'AR',
    title: 'AR',
    description: 'Kehadiran AR vs Piket LUPG AR per bulan.',
    series: [
      { key: 'ATT_PCT_AR', label: 'AR', colorToken: 'var(--chart-5)' },
      {
        key: 'ATT_PCT_PIKET_AR',
        label: 'Piket LUPG AR',
        colorToken: 'var(--chart-1)',
      },
    ],
  },
  {
    key: 'GPN',
    title: 'GPN',
    description: 'GPN A & B dibanding Piket LUPG GPN per bulan.',
    series: [
      { key: 'ATT_PCT_GPN_A', label: 'GPN A', colorToken: 'var(--chart-2)' },
      { key: 'ATT_PCT_GPN_B', label: 'GPN B', colorToken: 'var(--chart-3)' },
      {
        key: 'ATT_PCT_PIKET_GPN_A',
        label: 'Piket LUPG GPN A',
        colorToken: 'var(--chart-4)',
      },
      {
        key: 'ATT_PCT_PIKET_GPN_B',
        label: 'Piket LUPG GPN B',
        colorToken: 'var(--chart-5)',
      },
    ],
  },
]

/** Last N months up to maxKey, bounded to the provided month list. */
function defaultSelectedMonths(
  months: string[],
  maxKey: string,
  n = 4
): string[] {
  const available = months.filter((m) => m <= maxKey)
  if (available.length === 0) return months.slice(0, Math.min(n, months.length))
  return available.slice(-n)
}

const percentTickFormatter = makeAxisFormatter('percent')
const percentValueFormatter = (v: number) => formatChartValue(v, 'percent')

export function AttendanceCharts({
  year,
  currentMonthKey,
  monthlyReports,
  metricReports,
}: Props) {
  const allMonths = useMemo(() => allMonthKeysForYear(year), [year])

  const [selected, setSelected] = useState<string[]>(() =>
    defaultSelectedMonths(allMonths, currentMonthKey, 4)
  )

  const reportByMonthKey = useMemo(() => {
    const m = new Map<string, MonthlyReportRow>()
    for (const r of monthlyReports) m.set(r.month.slice(0, 7), r)
    return m
  }, [monthlyReports])

  const metricByKey = useMemo(() => {
    const m = new Map<string, MetricReportRow>()
    for (const r of metricReports) {
      m.set(`${r.monthly_report_id}__${r.metric_code}`, r)
    }
    return m
  }, [metricReports])

  // Don't render chips for months the user cannot pick yet.
  const visibleMonths = allMonths.filter((mk) => mk <= currentMonthKey)
  const effectiveSelected = selected.filter((m) => visibleMonths.includes(m))
  const monthsForChart =
    effectiveSelected.length > 0
      ? effectiveSelected
      : defaultSelectedMonths(visibleMonths, currentMonthKey, 3)

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle>Grafik Kehadiran vs Piket LUPG</CardTitle>
            <CardDescription>
              Perbandingan persentase kehadiran dan piket per kategori. Pilih
              bulan di bawah untuk memfilter.
            </CardDescription>
          </div>
        </div>
        <div className='-mx-2 mt-2 flex justify-center overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <MonthSelectionChips
            months={allMonths}
            selectedMonths={selected}
            onChange={setSelected}
            maxMonthKey={currentMonthKey}
            labelStyle='full'
            maxVisibleMonths={6}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid gap-6 xl:grid-cols-2'>
          {CATEGORY_CHARTS.map((chart) => {
            const data: MultiBarRow[] = monthsForChart.map((mk) => {
              const report = reportByMonthKey.get(mk)
              const row: MultiBarRow = { label: monthNameFromKey(mk) }
              for (const s of chart.series) {
                const metric = report
                  ? metricByKey.get(`${report.id}__${s.key}`)
                  : undefined
                row[s.key] =
                  metric?.current_value != null
                    ? Number(metric.current_value)
                    : 0
              }
              return row
            })
            return (
              <div
                key={chart.key}
                className='flex w-full min-w-0 flex-col gap-2'
              >
                <div>
                  <div className='text-sm font-semibold'>{chart.title}</div>
                  <div className='text-xs text-muted-foreground'>
                    {chart.description}
                  </div>
                </div>
                <div className='-mx-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                  <div className='min-w-70'>
                    <HighlightedMultiBar
                      data={data}
                      series={chart.series}
                      height={260}
                      valueDomain={[0, 100]}
                      showValueLabel
                      tickFormatter={percentTickFormatter}
                      valueFormatter={percentValueFormatter}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
