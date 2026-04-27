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
  getQuarterEndMonthKey,
  getQuarterStartMonthKey,
  isQuarterEditable,
  QUARTER_LABEL,
  type Quarter,
} from '../utils/editability'
import { HighlightedBar, type BarDatum } from '@/components/charts/highlighted-bar'
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

const QUARTERS: Quarter[] = [1, 2, 3, 4]

export function ProgramQuarterlyCard({
  program,
  kelompokId,
  year,
  currentMonthKey,
  monthlyReports,
  programReports,
  userRole,
  userOwnsKelompok,
}: Props) {
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
      QUARTERS.map((q) => {
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
      }),
    [reportByMonthKey, programRowByReportId, currentMonthKey, year]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{program.name}</CardTitle>
        <CardDescription>
          {program.denominator_label} → {program.count_label} · 4x per tahun
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 lg:grid-cols-5'>
        <div className='overflow-x-auto lg:col-span-3'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quarter</TableHead>
                <TableHead>Sensus</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead className='text-right'>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {QUARTERS.map((q) => {
                const endKey = getQuarterEndMonthKey(q, year)
                const report = reportByMonthKey.get(endKey)
                const row = report
                  ? programRowByReportId.get(report.id)
                  : undefined
                const editability = isQuarterEditable(
                  q,
                  year,
                  currentMonthKey,
                  report,
                  userRole,
                  userOwnsKelompok
                )
                return (
                  <ProgramEditableRow
                    key={q}
                    rowLabel={QUARTER_LABEL[q]}
                    kelompokId={kelompokId}
                    monthKey={endKey}
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
          <HighlightedBar data={chartData} />
        </div>
      </CardContent>
    </Card>
  )
}
