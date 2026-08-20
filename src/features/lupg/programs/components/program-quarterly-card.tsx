import { useMemo } from 'react'
import { type Role } from '@/lib/rbac'
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
import {
  type MonthlyReportRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
} from '../../types'
import {
  getQuarterEndMonthKey,
  isQuarterEditable,
  QUARTER_LABEL,
  type Quarter,
} from '../utils/editability'
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

function notesHeaderLabel(programCode: string): string {
  if (programCode === 'SHOLAT_ACR' || programCode === 'GMKM')
    return 'Keterangan'
  return 'Hasil Temuan'
}

export function ProgramQuarterlyBody({
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

  return (
    <div className='flex flex-col gap-3'>
      {/* Mobile: stacked cards */}
      <div className='flex flex-col gap-2 md:hidden'>
        {QUARTERS.map((q) => {
          const endKey = getQuarterEndMonthKey(q, year)
          const report = reportByMonthKey.get(endKey)
          const row = report ? programRowByReportId.get(report.id) : undefined
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
              key={`card-${q}`}
              rowLabel={QUARTER_LABEL[q]}
              kelompokId={kelompokId}
              monthKey={endKey}
              programCode={program.code}
              existing={row}
              editability={editability}
              layout='card'
            />
          )
        })}
      </div>

      {/* Desktop: full table */}
      <div className='hidden overflow-x-auto md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quarter</TableHead>
              <TableHead>Sensus</TableHead>
              <TableHead>
                {program.code === 'GMKM' ? 'Jumlah Kehadiran' : 'Jumlah'}
              </TableHead>
              <TableHead className='text-right'>%</TableHead>
              <TableHead>{notesHeaderLabel(program.code)}</TableHead>
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
    </div>
  )
}

/** Thin wrapper that retains the old Card shell for any legacy caller. */
export function ProgramQuarterlyCard(props: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.program.name}</CardTitle>
        <CardDescription>
          {props.program.denominator_label} → {props.program.count_label} · 4x
          per tahun
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProgramQuarterlyBody {...props} />
      </CardContent>
    </Card>
  )
}
