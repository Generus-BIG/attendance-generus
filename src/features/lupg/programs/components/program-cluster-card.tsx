import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { type Role } from '@/lib/rbac'
import { cn } from '@/lib/utils'
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

const HEAD =
  'bg-background text-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase border-b'

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

  const renderRow = (mk: string, layout: 'row' | 'card' = 'row') => {
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
        layout={layout}
        />
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {/* Mobile: stacked cards */}
      <div className='flex flex-col gap-2 md:hidden'>
        {pastAndCurrent.map((monthKey) => renderRow(monthKey, 'card'))}
        {future.length > 0 && (
          <button
            type='button'
            onClick={() => setShowFuture((value) => !value)}
            aria-expanded={showFuture}
            className='flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          >
            <ChevronRight
              className={cn(
                'size-3 transition-transform motion-reduce:transition-none',
                showFuture && 'rotate-90'
              )}
            />
            {showFuture
              ? `Sembunyikan ${future.length} bulan mendatang`
              : `Tampilkan ${future.length} bulan mendatang`}
          </button>
        )}
        {showFuture && future.map((monthKey) => renderRow(monthKey, 'card'))}
      </div>

      {/* Desktop: full table */}
      <div className='hidden overflow-x-auto md:block'>
        <Table className='min-w-[74rem] border-separate border-spacing-0 overflow-hidden rounded-lg border tabular-nums [&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-r'>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className={cn(HEAD, 'w-32')}>
                Bulan
              </TableHead>
              <TableHead rowSpan={2} className={cn(HEAD, 'w-28 text-right')}>
                Sensus
              </TableHead>
              <TableHead
                colSpan={2}
                className={cn(HEAD, 'bg-muted/50 text-center')}
              >
                Belum Siap Menikah
              </TableHead>
              <TableHead
                colSpan={2}
                className={cn(HEAD, 'bg-muted/50 text-center')}
              >
                Siap Menikah
              </TableHead>
              <TableHead
                colSpan={2}
                className={cn(HEAD, 'bg-muted/50 text-center')}
              >
                Menikah
              </TableHead>
              <TableHead rowSpan={2} className={cn(HEAD, 'min-w-72')}>
                Hasil Temuan
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className={cn(HEAD, 'text-right')}>
                Realisasi
              </TableHead>
              <TableHead className={cn(HEAD, 'text-right')}>Capaian</TableHead>
              <TableHead className={cn(HEAD, 'text-right')}>
                Realisasi
              </TableHead>
              <TableHead className={cn(HEAD, 'text-right')}>Capaian</TableHead>
              <TableHead className={cn(HEAD, 'text-right')}>
                Realisasi
              </TableHead>
              <TableHead className={cn(HEAD, 'text-right')}>Capaian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='[&_tr:last-child_td]:border-b-0'>
            {pastAndCurrent.map((monthKey) => renderRow(monthKey))}

            {future.length > 0 && (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={9} className='border-b p-0'>
                  <button
                    type='button'
                    onClick={() => setShowFuture((v) => !v)}
                    aria-expanded={showFuture}
                    className='flex w-full items-center justify-center gap-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
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

            {showFuture && future.map((monthKey) => renderRow(monthKey))}
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
          {props.program.denominator_label} → {props.program.count_label} (3
          cluster)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProgramClusterBody {...props} />
      </CardContent>
    </Card>
  )
}
