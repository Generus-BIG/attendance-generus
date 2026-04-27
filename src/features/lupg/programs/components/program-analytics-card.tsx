import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  HighlightedBar,
  type BarDatum,
} from '@/components/charts/highlighted-bar'
import {
  type MonthlyReportRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
} from '../../types'
import {
  allMonthKeysForYear,
  getQuarterEndMonthKey,
  getQuarterStartMonthKey,
  monthNameFromKey,
  type Quarter,
} from '../utils/editability'

interface Props {
  program: ProgramDefinitionRow
  year: number
  currentMonthKey: string
  monthlyReports: MonthlyReportRow[]
  programReports: ProgramReportRow[]
}

const QUARTERS: Quarter[] = [1, 2, 3, 4]

export function ProgramAnalyticsCard({
  program,
  year,
  currentMonthKey,
  monthlyReports,
  programReports,
}: Props) {
  const reportByMonthKey = useMemo(() => {
    const m = new Map<string, MonthlyReportRow>()
    for (const r of monthlyReports) m.set(r.month.slice(0, 7), r)
    return m
  }, [monthlyReports])

  const programRowByReportId = useMemo(() => {
    const m = new Map<string, ProgramReportRow>()
    for (const r of programReports) {
      if (r.program_code === program.code) m.set(r.monthly_report_id, r)
    }
    return m
  }, [programReports, program.code])

  const isQuarterly = program.reporting_style === 'quarterly'

  const chartData: BarDatum[] = useMemo(() => {
    if (isQuarterly) {
      return QUARTERS.map((q) => {
        const endKey = getQuarterEndMonthKey(q, year)
        const report = reportByMonthKey.get(endKey)
        const row = report ? programRowByReportId.get(report.id) : undefined
        const startKey = getQuarterStartMonthKey(q, year)
        const notStarted = currentMonthKey < startKey
        return {
          label: `Q${q}`,
          value: row?.count_this_month ?? 0,
          isPlaceholder: notStarted,
        }
      })
    }
    return allMonthKeysForYear(year).map((mk) => {
      const report = reportByMonthKey.get(mk)
      const row = report ? programRowByReportId.get(report.id) : undefined
      const isFuture = mk > currentMonthKey
      return {
        label: monthNameFromKey(mk).slice(0, 3),
        value: row?.count_this_month ?? 0,
        isPlaceholder: isFuture,
      }
    })
  }, [
    isQuarterly,
    year,
    reportByMonthKey,
    programRowByReportId,
    currentMonthKey,
  ])

  const totalYTD = useMemo(
    () =>
      chartData
        .filter((d) => !d.isPlaceholder)
        .reduce((a, b) => a + b.value, 0),
    [chartData]
  )
  const bestLabel = useMemo(() => {
    const pastData = chartData.filter((d) => !d.isPlaceholder && d.value > 0)
    if (pastData.length === 0) return '-'
    const best = pastData.reduce((a, b) => (b.value > a.value ? b : a))
    return `${best.label} (${best.value})`
  }, [chartData])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{program.name}</CardTitle>
        <CardDescription>
          {program.denominator_label} -&gt; {program.count_label}
          {isQuarterly ? ' (4x per tahun)' : ' (12x per tahun)'}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4'>
        <div className='grid gap-3 sm:grid-cols-3'>
          <Stat label='Total YTD' value={totalYTD.toString()} />
          <Stat label='Tertinggi' value={bestLabel} />
          <Stat
            label={isQuarterly ? 'Quarter berjalan' : 'Bulan berjalan'}
            value={
              isQuarterly
                ? quarterOf(currentMonthKey)
                : monthNameFromKey(currentMonthKey).slice(0, 3)
            }
          />
        </div>
        <HighlightedBar data={chartData} height={240} />
      </CardContent>
    </Card>
  )
}

function quarterOf(monthKey: string): string {
  const m = parseInt(monthKey.slice(5, 7), 10)
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='bg-muted/30 rounded-md p-3'>
      <div className='text-muted-foreground text-xs'>{label}</div>
      <div className='text-lg font-semibold tabular-nums'>{value}</div>
    </div>
  )
}
