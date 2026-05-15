import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type MonthlyReportRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
} from '../../types'
import { programSummary } from '../utils/program-summary'

type DeltaKind = 'up' | 'down' | 'flat' | 'none'

type Props = {
  program: ProgramDefinitionRow
  currentMonthKey: string
  monthlyReports: MonthlyReportRow[]
  programReports: ProgramReportRow[]
  children: React.ReactNode
}

/**
 * Static (non-collapsible) program card. Mirrors the previous accordion's header
 * summary — kicker, name, % completion, delta vs previous month, and current
 * count — but renders the body unconditionally below it.
 */
export function ProgramSectionCard({
  program,
  currentMonthKey,
  monthlyReports,
  programReports,
  children,
}: Props) {
  const { reportByMonthKey, programRowByReportId } = useMemo(() => {
    const byMonth = new Map<string, MonthlyReportRow>()
    for (const r of monthlyReports) byMonth.set(r.month.slice(0, 7), r)
    const byReport = new Map<string, ProgramReportRow>()
    for (const r of programReports) {
      if (r.program_code === program.code) byReport.set(r.monthly_report_id, r)
    }
    return { reportByMonthKey: byMonth, programRowByReportId: byReport }
  }, [monthlyReports, programReports, program.code])

  const summary = programSummary({
    currentMonthKey,
    reportByMonthKey,
    programRowByReportId,
  })

  const delta =
    summary.currentPct != null && summary.prevPct != null
      ? summary.currentPct - summary.prevPct
      : null
  const kind: DeltaKind =
    delta == null
      ? 'none'
      : Math.abs(delta) < 0.5
        ? 'flat'
        : delta > 0
          ? 'up'
          : 'down'
  const Arrow = kind === 'up' ? ArrowUp : kind === 'down' ? ArrowDown : Minus
  const deltaTone =
    kind === 'up'
      ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-400/10'
      : kind === 'down'
        ? 'text-red-700 bg-red-500/10 dark:text-red-300 dark:bg-red-400/10'
        : 'text-muted-foreground bg-muted/60'
  const deltaLabel =
    delta == null
      ? '—'
      : kind === 'flat'
        ? 'Stabil'
        : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}pp`

  const displayPct = summary.currentPct != null ? `${summary.currentPct}%` : '—'
  const displayCount =
    summary.countCurrent != null && summary.denomCurrent != null
      ? `${summary.countCurrent}/${summary.denomCurrent}`
      : null

  return (
    <div className='bg-card text-card-foreground rounded-xl border shadow-sm'>
      <div className='grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 sm:px-5'>
        <div className='min-w-0'>
          <div className='text-muted-foreground text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
            {program.denominator_label} → {program.count_label}
          </div>
          <div className='truncate text-sm font-semibold tracking-tight'>
            {program.name}
          </div>
        </div>
        <div className='text-xl font-semibold tabular-nums'>{displayPct}</div>
        <div
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums',
            deltaTone
          )}
        >
          <Arrow className='h-3 w-3' strokeWidth={2.5} aria-hidden='true' />
          {deltaLabel}
        </div>
        <div className='flex items-center gap-2'>
          {displayCount && (
            <span className='text-muted-foreground hidden text-xs tabular-nums sm:inline'>
              {displayCount}
            </span>
          )}
        </div>
      </div>
      <div className='border-border/60 border-t px-4 py-4 sm:px-5'>
        {children}
      </div>
    </div>
  )
}
