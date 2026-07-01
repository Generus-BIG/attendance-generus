import { format, parseISO } from 'date-fns'
import { type MeetingRecap } from '../types'

/**
 * Pick the anchor month for a fixed-forms heatmap.
 *
 * Rule: month with the most meetings wins; ties broken by recency
 * (the latest month). Returns the month key in 'YYYY-MM' format.
 *
 * Returns `null` when there are no meetings — the caller should fall
 * back to another anchor (e.g. the first form's month) in that case.
 */
export function computeAnchorMonth(meetings: MeetingRecap[]): string | null {
  if (meetings.length === 0) return null

  const countsByMonth = new Map<string, { count: number; latest: string }>()

  for (const meeting of meetings) {
    const monthKey = format(parseISO(meeting.date), 'yyyy-MM')
    const existing = countsByMonth.get(monthKey)
    if (!existing) {
      countsByMonth.set(monthKey, { count: 1, latest: meeting.date })
    } else {
      existing.count += 1
      if (meeting.date > existing.latest) existing.latest = meeting.date
    }
  }

  let winner: { month: string; count: number; latest: string } | null = null
  for (const [month, info] of countsByMonth) {
    if (
      !winner ||
      info.count > winner.count ||
      (info.count === winner.count && info.latest > winner.latest)
    ) {
      winner = { month, count: info.count, latest: info.latest }
    }
  }

  return winner?.month ?? null
}
