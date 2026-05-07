import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ReportStatusBadge } from './report-status-badge'
import { formatMonthLabel, monthKeyFromDate } from '../utils/month-utils'

type ReportSummary = {
  id: string
  status: 'draft' | 'submitted'
  locked: boolean
  month: string
  submitter_display_name?: string | null
  submitted_at?: string | null
  created_at?: string | null
}

interface Props {
  kelompokName: string
  monthKey: string
  report?: ReportSummary
  onOpenNotStarted?: () => void
  disabled?: boolean
  className?: string
}

export function ReportCard({
  kelompokName,
  monthKey,
  report,
  onOpenNotStarted,
  disabled,
  className,
}: Props) {
  const monthLabel = formatMonthLabel(monthKey)

  if (!report) {
    const inner = (
      <>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-base font-semibold text-foreground'>
              {kelompokName}
            </p>
            <p className='text-muted-foreground text-sm'>{monthLabel}</p>
          </div>
          <span className='text-muted-foreground text-xs'>Belum dibuka</span>
        </div>
        <div className='text-muted-foreground mt-4 text-sm'>
          Klik untuk membuka laporan bulan ini.
        </div>
      </>
    )

    const baseClass = cn(
      'border-border bg-card text-card-foreground flex min-h-[7rem] flex-col rounded-lg border border-dashed p-4 text-left',
      'transition-colors',
      !disabled &&
        'hover:border-foreground/30 hover:bg-accent/40 focus-visible:border-foreground/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
      disabled && 'opacity-60',
      className
    )

    if (onOpenNotStarted && !disabled) {
      return (
        <button type='button' onClick={onOpenNotStarted} className={baseClass}>
          {inner}
        </button>
      )
    }
    return <div className={baseClass}>{inner}</div>
  }

  const reportMonthKey = monthKeyFromDate(report.month)

  const metaLine = (() => {
    if (report.status === 'submitted') {
      const parts: string[] = []
      if (report.submitter_display_name)
        parts.push(`Oleh ${report.submitter_display_name}`)
      if (report.submitted_at) {
        parts.push(
          format(parseISO(report.submitted_at), 'dd MMM yyyy', {
            locale: idLocale,
          })
        )
      }
      return parts.join(' · ') || '—'
    }
    if (report.created_at) {
      return `Draft sejak ${format(parseISO(report.created_at), 'dd MMM yyyy', { locale: idLocale })}`
    }
    return 'Draft'
  })()

  return (
    <Link
      to='/admin/lupg/reports/$monthlyReportId'
      params={{ monthlyReportId: report.id }}
      aria-label={`Buka laporan ${kelompokName}, ${formatMonthLabel(reportMonthKey)}, status ${report.status === 'submitted' ? 'selesai' : 'draft'}${report.locked ? ', terkunci' : ''}`}
      className={cn(
        'border-border bg-card text-card-foreground flex min-h-[7rem] flex-col rounded-lg border p-4',
        'transition-colors',
        'hover:border-foreground/30 hover:bg-accent/40',
        'focus-visible:border-foreground/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        className
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-base font-semibold text-foreground'>
            {kelompokName}
          </p>
          <p className='text-muted-foreground text-sm'>
            {formatMonthLabel(reportMonthKey)}
          </p>
        </div>
        <ReportStatusBadge status={report.status} locked={report.locked} />
      </div>
      <div className='mt-auto flex items-end justify-between pt-4'>
        <p className='text-muted-foreground text-sm'>{metaLine}</p>
        <ChevronRight
          className='text-muted-foreground h-4 w-4 shrink-0'
          aria-hidden='true'
        />
      </div>
    </Link>
  )
}
