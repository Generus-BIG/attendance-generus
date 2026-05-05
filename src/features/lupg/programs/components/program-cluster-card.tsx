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
import { ProgramClusterEditableRow } from './program-cluster-editable-row'

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

export function ProgramClusterBody({
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

  const { past, current, future } = useMemo(() => {
    const p: string[] = []
    const f: string[] = []
    let c: string | null = null
    for (const mk of monthKeys) {
      if (mk < currentMonthKey) p.push(mk)
      else if (mk === currentMonthKey) c = mk
      else f.push(mk)
    }
    // If current year is future-only or current month isn't in this year
    // (e.g. viewing previous year), treat latest available as "current".
    if (!c && p.length === 0 && f.length > 0) {
      c = f.shift() ?? null
    } else if (!c && p.length > 0) {
      c = p.pop() ?? null
    }
    return { past: p, current: c, future: f }
  }, [monthKeys, currentMonthKey])

  const [showPast, setShowPast] = useState(false)
  const [showFuture, setShowFuture] = useState(false)

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

  const renderRow = (mk: string) => {
    const report = reportByMonthKey.get(mk)
    const row = report ? programRowByReportId.get(report.id) : undefined
    const editability = isMonthEditable(
      mk,
      currentMonthKey,
      report,
      userRole,
      userOwnsKelompok
    )
    return (
      <ProgramClusterEditableRow
        key={mk}
        rowLabel={monthNameFromKey(mk)}
        kelompokId={kelompokId}
        monthKey={mk}
        programCode={program.code}
        existing={row}
        editability={editability}
      />
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2}>Bulan</TableHead>
              <TableHead rowSpan={2}>Sensus</TableHead>
              <TableHead colSpan={2} className='text-center'>
                Belum Siap Menikah
              </TableHead>
              <TableHead colSpan={2} className='text-center'>
                Siap Menikah
              </TableHead>
              <TableHead colSpan={2} className='text-center'>
                Menikah
              </TableHead>
              <TableHead rowSpan={2}>Hasil Temuan</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>Jumlah</TableHead>
              <TableHead className='text-right'>%</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead className='text-right'>%</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead className='text-right'>%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {past.length > 0 && (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={9} className='p-0'>
                  <button
                    type='button'
                    onClick={() => setShowPast((v) => !v)}
                    aria-expanded={showPast}
                    className='text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center justify-center gap-2 py-2 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  >
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 transition-transform motion-reduce:transition-none',
                        showPast && 'rotate-90'
                      )}
                    />
                    {showPast
                      ? `Sembunyikan ${past.length} bulan lalu`
                      : `Tampilkan ${past.length} bulan lalu`}
                  </button>
                </TableCell>
              </TableRow>
            )}

            {showPast && past.map(renderRow)}

            {current && renderRow(current)}

            {future.length > 0 && (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={9} className='p-0'>
                  <button
                    type='button'
                    onClick={() => setShowFuture((v) => !v)}
                    aria-expanded={showFuture}
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

            {showFuture && future.map(renderRow)}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/** Thin wrapper that retains the old Card shell for any legacy caller. */
export function ProgramClusterCard(props: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.program.name}</CardTitle>
        <CardDescription>
          {props.program.denominator_label} → {props.program.count_label} (3 cluster)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProgramClusterBody {...props} />
      </CardContent>
    </Card>
  )
}
