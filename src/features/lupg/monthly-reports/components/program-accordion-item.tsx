import { useMemo } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Minus } from 'lucide-react'
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
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function ProgramAccordionItem({
  program,
  currentMonthKey,
  monthlyReports,
  programReports,
  open,
  onToggle,
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
    <div className='border-border/70 bg-background rounded-md border'>
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-left',
          'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
          'transition-colors'
        )}
      >
        <div className='min-w-0'>
          <div className='text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted-foreground'>
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
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-300',
              open && 'rotate-180'
            )}
            aria-hidden='true'
          />
        </div>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className='overflow-hidden'>
          <div className='border-border/60 border-t px-4 py-4'>{children}</div>
        </div>
      </div>
    </div>
  )
}
