import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type MonthlyFormRecap } from '../types'
import {
  buildCalendarCells,
  type DayCell,
  tierBg,
  tierText,
} from '../utils/calendar-cells'

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

type Props = {
  recap: MonthlyFormRecap | undefined
  monthDate: Date
  isLoading: boolean
}

export function AttendanceCalendarHeatmap({ recap, monthDate, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className='h-64 w-full' />
  }

  const totalCensus = recap?.totals.totalCensus ?? 0
  const cells = buildCalendarCells({
    monthDate,
    meetings: recap?.meetings ?? [],
    totalCensus,
  })

  const hasAnyMeeting = (recap?.meetings.length ?? 0) > 0

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
          Kalender kehadiran — {format(monthDate, 'MMMM yyyy', { locale: idLocale })}
        </div>
        <HeatmapLegend />
      </div>

      {!hasAnyMeeting ? (
        <div className='border-border/60 text-muted-foreground flex h-48 items-center justify-center rounded-md border border-dashed text-sm'>
          Belum ada pertemuan tercatat di bulan ini.
        </div>
      ) : (
        <TooltipProvider delayDuration={120}>
          <div className='flex flex-col gap-1.5'>
            <div className='text-muted-foreground grid grid-cols-7 gap-1 text-center text-[0.625rem] font-medium uppercase tracking-[0.08em]'>
              {WEEKDAY_LABELS.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
            <div className='grid grid-cols-7 gap-1'>
              {cells.map((cell) => (
                <HeatmapCell key={cell.date.getTime()} cell={cell} />
              ))}
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}

function HeatmapCell({ cell }: { cell: DayCell }) {
  const { date, inMonth, inFuture, meeting, ratePct, tier } = cell
  const dayNum = format(date, 'd')
  const dateLabel = format(date, 'EEEE, dd MMMM yyyy', { locale: idLocale })

  // Base cell appearance
  const baseClasses =
    'relative flex aspect-square min-h-8 items-center justify-center rounded-md text-xs tabular-nums transition-colors'
  const stateClasses = !inMonth
    ? 'text-muted-foreground/40 bg-transparent'
    : inFuture
      ? 'text-muted-foreground/60 bg-muted/30'
      : cn(tierBg(tier), tierText(tier))

  // When meeting exists: wrap in Tooltip for hover detail.
  if (meeting && inMonth) {
    const izinPct =
      meeting.izin > 0 && ratePct != null
        ? (meeting.izin / (meeting.hadir + meeting.izin)) * 100
        : 0
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            className={cn(
              baseClasses,
              stateClasses,
              'hover:ring-foreground/40 focus-visible:ring-foreground focus-visible:outline-none hover:ring-1 focus-visible:ring-2'
            )}
            aria-label={`${dateLabel} — kehadiran ${Math.round(ratePct ?? 0)}%`}
          >
            <span className='font-semibold'>{dayNum}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side='top' className='max-w-xs text-xs'>
          <div className='flex flex-col gap-1'>
            <div className='font-medium'>{dateLabel}</div>
            <div className='tabular-nums'>
              Hadir: {meeting.hadir}
              {' · '}Izin: {meeting.izin}
            </div>
            {ratePct != null && (
              <div className='text-muted-foreground tabular-nums'>
                Tingkat: {Math.round(ratePct)}%
                {izinPct > 0 && ` · Izin ${Math.round(izinPct)}% dari yang merespons`}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  // No meeting (or padding day): static div, no tooltip, no interaction.
  return (
    <div
      className={cn(baseClasses, stateClasses)}
      aria-label={inMonth ? `${dateLabel} — tidak ada pertemuan` : undefined}
    >
      <span>{inMonth ? dayNum : ''}</span>
    </div>
  )
}

function HeatmapLegend() {
  const items: Array<{ label: string; swatch: string }> = [
    { label: '<25%', swatch: 'bg-[var(--heatmap-1)]' },
    { label: '25–49%', swatch: 'bg-[var(--heatmap-2)]' },
    { label: '50–74%', swatch: 'bg-[var(--heatmap-3)]' },
    { label: '≥75%', swatch: 'bg-[var(--heatmap-4)]' },
  ]
  return (
    <div className='flex items-center gap-2 text-[0.625rem] font-medium uppercase tracking-[0.08em]'>
      <span className='text-muted-foreground'>Rendah</span>
      <div className='flex items-center gap-0.5'>
        {items.map((it) => (
          <span
            key={it.label}
            className={cn('h-3 w-3 rounded-sm', it.swatch)}
            title={it.label}
            aria-hidden='true'
          />
        ))}
      </div>
      <span className='text-muted-foreground'>Tinggi</span>
    </div>
  )
}
