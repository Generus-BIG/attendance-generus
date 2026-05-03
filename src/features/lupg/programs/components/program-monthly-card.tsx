import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type Role } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import { HighlightedBar, type BarDatum } from '@/components/charts/highlighted-bar'
import {
  type MonthlyReportRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
} from '../../types'
import { formatChartValue } from '../../utils/format-chart-value'
import {
  allMonthKeysForYear,
  isMonthEditable,
  monthNameFromKey,
} from '../utils/editability'
import { ProgramEditableRow } from './program-editable-row'

function notesHeaderLabel(programCode: string): string {
  if (programCode === 'SHOLAT_ACR') return 'Keterangan'
  return 'Hasil Temuan'
}

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

  const { pastAndCurrent, future } = useMemo(() => {
    const past: string[] = []
    const fut: string[] = []
    for (const mk of monthKeys) {
      if (mk <= currentMonthKey) past.push(mk)
      else fut.push(mk)
    }
    return { pastAndCurrent: past, future: fut }
  }, [monthKeys, currentMonthKey])

  const [showFuture, setShowFuture] = useState(
    () => !monthKeys.some((mk) => mk <= currentMonthKey)
  )

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
                <TableHead>{notesHeaderLabel(program.code)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastAndCurrent.map((mk) => {
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

              {future.length > 0 && (
                <TableRow className='hover:bg-transparent'>
                  <TableCell colSpan={5} className='p-0'>
                    <button
                      type='button'
                      onClick={() => setShowFuture((v) => !v)}
                      aria-expanded={showFuture}
                      aria-controls={`future-rows-${program.code}`}
                      className='text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center justify-center gap-2 py-2 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
                    >
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 transition-transform motion-reduce:transition-none',
                          showFuture && 'rotate-90'
                        )}
                      />
                      {showFuture
                        ? `Sembunyikan ${future.length} bulan mendatang`
                        : `Tampilkan ${future.length} bulan mendatang`}
                    </button>
                  </TableCell>
                </TableRow>
              )}

              {showFuture &&
                future.map((mk) => {
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
