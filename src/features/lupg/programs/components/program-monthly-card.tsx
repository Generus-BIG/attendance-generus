import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type Role } from '@/lib/rbac'
import {
  type MonthlyReportRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
} from '../../types'
import {
  allMonthKeysForYear,
  isMonthEditable,
  monthNameFromKey,
} from '../utils/editability'
import { HighlightedBar, type BarDatum } from '@/components/charts/highlighted-bar'
import { formatChartValue } from '../../utils/format-chart-value'
import { ProgramEditableRow } from './program-editable-row'

interface Props {
  program: ProgramDefinitionRow
  kelompokId: string
  year: number
  currentMonthKey: string
  monthlyReports: MonthlyReportRow[]
  programReports: ProgramReportRow[]
  userRole: Role
  userOwnsKelompok: boolean
}

export function ProgramMonthlyCard({
  program,
  kelompokId,
  year,
  currentMonthKey,
  monthlyReports,
  programReports,
  userRole,
  userOwnsKelompok,
}: Props) {
  const monthKeys = useMemo(() => allMonthKeysForYear(year), [year])

  const reportByMonthKey = useMemo(() => {
    const m = new Map<string, MonthlyReportRow>()
    for (const r of monthlyReports) {
      m.set(r.month.slice(0, 7), r)
    }
    return m
  }, [monthlyReports])

  const programRowByReportId = useMemo(() => {
    const m = new Map<string, ProgramReportRow>()
    for (const r of programReports) {
      if (r.program_code === program.code) {
        m.set(r.monthly_report_id, r)
      }
    }
    return m
  }, [programReports, program.code])

  const chartData: BarDatum[] = useMemo(
    () =>
      monthKeys.map((mk) => {
        const report = reportByMonthKey.get(mk)
        const row = report ? programRowByReportId.get(report.id) : undefined
        const isFuture = mk > currentMonthKey
        return {
          label: monthNameFromKey(mk).slice(0, 3),
          value: row?.count_this_month ?? 0,
          isPlaceholder: isFuture,
        }
      }),
    [monthKeys, reportByMonthKey, programRowByReportId, currentMonthKey]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{program.name}</CardTitle>
        <CardDescription>
          {program.denominator_label} → {program.count_label}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 lg:grid-cols-5'>
        <div className='overflow-x-auto lg:col-span-3'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bulan</TableHead>
                <TableHead>Sensus</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead className='text-right'>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthKeys.map((mk) => {
                const report = reportByMonthKey.get(mk)
                const row = report
                  ? programRowByReportId.get(report.id)
                  : undefined
                const editability = isMonthEditable(
                  mk,
                  currentMonthKey,
                  report,
                  userRole,
                  userOwnsKelompok
                )
                return (
                  <ProgramEditableRow
                    key={mk}
                    rowLabel={monthNameFromKey(mk)}
                    kelompokId={kelompokId}
                    monthKey={mk}
                    programCode={program.code}
                    existing={row}
                    editability={editability}
                  />
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className='lg:col-span-2'>
          <HighlightedBar
            data={chartData}
            showValueLabel
            xAxisLabel='Bulan'
            yAxisLabel='Jumlah Generus'
            valueFormatter={(v) => formatChartValue(v, 'number')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
