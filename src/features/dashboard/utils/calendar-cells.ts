import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { type MeetingRecap } from '../types'

/** A single cell in the month grid. */
export type DayCell = {
  /** Calendar date this cell represents. */
  date: Date
  /** True when `date` is inside the viewed month; false for padding days. */
  inMonth: boolean
  /** True when `date` > today (render visibly as future). */
  inFuture: boolean
  /** Meeting on this date, if any. */
  meeting: MeetingRecap | null
  /** Attendance rate on this date: `hadir / census`, or null when no meeting or no census. */
  ratePct: number | null
  /** Bucket 0–4 for color ramp. 0 = no meeting; 1..4 = rate tier. */
  tier: 0 | 1 | 2 | 3 | 4
}

/**
 * Build a Monday-first 7-column grid covering the whole viewed month plus
 * leading/trailing padding days. Length is always a multiple of 7 (usually
 * 35 or 42 cells).
 */
export function buildCalendarCells(params: {
  monthDate: Date
  meetings: MeetingRecap[]
  totalCensus: number
  today?: Date
}): DayCell[] {
  const { monthDate, meetings, totalCensus, today = new Date() } = params

  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  // Monday-first (ISO week).
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const meetingByDate = new Map<string, MeetingRecap>()
  for (const m of meetings) {
    meetingByDate.set(format(parseISO(m.date), 'yyyy-MM-dd'), m)
  }

  return days.map((date) => {
    const key = format(date, 'yyyy-MM-dd')
    const meeting = meetingByDate.get(key) ?? null
    const inMonth = isSameMonth(date, monthDate)
    const inFuture = date > today && !isSameDay(date, today)

    let ratePct: number | null = null
    let tier: DayCell['tier'] = 0
    if (meeting && totalCensus > 0) {
      ratePct = (meeting.hadir / totalCensus) * 100
      tier = tierFor(ratePct)
    }

    return { date, inMonth, inFuture, meeting, ratePct, tier }
  })
}

/**
 * Five-tier bucket used by the heatmap color ramp:
 *   0 = no meeting              → muted / no color
 *   1 = 0–24%                   → very low
 *   2 = 25–49%                  → low
 *   3 = 50–74%                  → mid
 *   4 = ≥75%                    → high
 */
export function tierFor(ratePct: number): 0 | 1 | 2 | 3 | 4 {
  if (ratePct < 25) return 1
  if (ratePct < 50) return 2
  if (ratePct < 75) return 3
  return 4
}

/** Tailwind class returning the correct `bg-*` for a tier. Theme tokens live in theme.css. */
export function tierBg(tier: DayCell['tier']): string {
  switch (tier) {
    case 0:
      return 'bg-[var(--heatmap-0)]'
    case 1:
      return 'bg-[var(--heatmap-1)]'
    case 2:
      return 'bg-[var(--heatmap-2)]'
    case 3:
      return 'bg-[var(--heatmap-3)]'
    case 4:
      return 'bg-[var(--heatmap-4)]'
  }
}

/** Return a readable text color class against the tier bg — high/mid tiers need light text. */
export function tierText(tier: DayCell['tier']): string {
  return tier >= 3 ? 'text-background' : 'text-foreground'
}
