import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { type MeetingRecap } from '../types'
import { tierBg, tierFor, tierText } from '../utils/calendar-cells'

interface EventTimelineStripProps {
  meetings: MeetingRecap[]
  totalCensus: number
  activeMonth: string
  onSelectMonth: (month: string) => void
  /** Form metadata, used to look up the event title for the tooltip. */
  forms?: Array<{ id: string; date: string; title: string }>
}

interface TimelineEntry {
  date: string
  month: string
  dayNumber: string
  monthShort: string
  meeting: MeetingRecap
  tier: 0 | 1 | 2 | 3 | 4
  formTitle: string | null
  ratePct: number
}

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

export function EventTimelineStrip({
  meetings,
  totalCensus,
  activeMonth,
  onSelectMonth,
  forms,
}: EventTimelineStripProps) {
  const entries = useMemo<TimelineEntry[]>(() => {
    const formByDate = new Map(forms?.map((f) => [f.date, f.title]) ?? [])
    return meetings
      .map((meeting) => {
        const date = parseISO(meeting.date)
        const month = format(date, 'yyyy-MM')
        const ratePct = totalCensus > 0 ? (meeting.hadir / totalCensus) * 100 : 0
        return {
          date: meeting.date,
          month,
          dayNumber: format(date, 'd'),
          monthShort: format(date, 'MMM', { locale: idLocale }),
          meeting,
          tier: totalCensus > 0 ? tierFor(ratePct) : (0 as const),
          formTitle: formByDate.get(meeting.date) ?? null,
          ratePct,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [meetings, totalCensus, forms])

  if (entries.length === 0) return null

  return (
    <div
      className='bg-muted/40 mt-4 rounded-md p-3 sm:p-4'
      aria-label='Timeline event'
    >
      <div className='text-muted-foreground mb-3 hidden text-[0.625rem] font-semibold tracking-[0.12em] uppercase sm:block'>
        Timeline event · klik dot untuk pindah anchor
      </div>
      <div className='-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible sm:pb-0'>
        <div className='relative flex min-w-min items-end gap-3 px-1 sm:min-w-0 sm:flex-wrap sm:px-0 sm:gap-x-4 sm:gap-y-3'>
          {entries.map((entry, idx) => {
            const isActive = entry.month === activeMonth
            const dotButton = (
              <button
                type='button'
                onClick={() => onSelectMonth(entry.month)}
                aria-label={`${entry.formTitle ?? entry.date} — ${entry.meeting.hadir} hadir, ${entry.meeting.izin} izin`}
                aria-pressed={isActive}
                className={cn(
                  'group flex flex-col items-center gap-1.5 outline-none',
                  'transition-transform duration-200',
                  'hover:-translate-y-0.5 active:scale-95',
                  'focus-visible:ring-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-muted/40 rounded-md'
                )}
                style={{ transitionTimingFunction: EASE_OUT }}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[0.625rem] font-bold shadow-sm tabular-nums sm:h-8 sm:w-8 sm:text-[0.6875rem]',
                    'transition-shadow duration-200 ease-out',
                    tierBg(entry.tier),
                    tierText(entry.tier),
                    isActive &&
                    'ring-foreground/70 ring-2 ring-offset-2 ring-offset-muted/40'
                  )}
                >
                  {entry.dayNumber}
                </span>
                <span
                  className={cn(
                    'text-[0.5625rem] font-medium tracking-[0.06em] uppercase sm:text-[0.625rem]',
                    isActive
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground'
                  )}
                >
                  {entry.monthShort}
                </span>
              </button>
            )

            const tooltipBody = (
              <div className='flex flex-col gap-1 text-xs'>
                <div className='font-medium'>
                  {format(parseISO(entry.date), 'EEEE, dd MMMM yyyy', {
                    locale: idLocale,
                  })}
                </div>
                {entry.formTitle && (
                  <div className='text-muted-foreground'>{entry.formTitle}</div>
                )}
                <div className='tabular-nums'>
                  Hadir: {entry.meeting.hadir} · Izin: {entry.meeting.izin}
                </div>
                {entry.ratePct > 0 && (
                  <div className='text-muted-foreground tabular-nums'>
                    Tingkat: {Math.round(entry.ratePct)}%
                  </div>
                )}
              </div>
            )

            return (
              <div key={entry.date} className='flex items-end'>
                <Tooltip>
                  <TooltipTrigger asChild>{dotButton}</TooltipTrigger>
                  <TooltipContent
                    side='top'
                    className='text-xs'
                    collisionPadding={8}
                  >
                    {tooltipBody}
                  </TooltipContent>
                </Tooltip>
                {idx < entries.length - 1 && (
                  <svg
                    width='24'
                    height='20'
                    viewBox='0 0 24 20'
                    aria-hidden='true'
                    className='text-muted-foreground/50 hidden sm:block'
                  >
                    <path
                      d='M 0 10 Q 12 0 24 10'
                      stroke='currentColor'
                      strokeWidth='1'
                      strokeDasharray='2 3'
                      fill='none'
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
