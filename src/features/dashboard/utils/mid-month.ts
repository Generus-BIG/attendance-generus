import { getDate, getDaysInMonth, isSameMonth } from 'date-fns'

/**
 * True when `today` is on or past the 15th of the month that `monthDate`
 * belongs to. When viewing a past month, always returns true (the month is
 * over). When viewing a future month, returns false.
 */
export function isPastMidMonth(
  monthDate: Date,
  today: Date = new Date()
): boolean {
  if (today < monthDate) return false
  if (!isSameMonth(monthDate, today)) return true
  return getDate(today) >= Math.floor(getDaysInMonth(monthDate) / 2)
}
