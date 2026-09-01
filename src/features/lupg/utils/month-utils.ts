import { format, parse } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

/** Returns 'YYYY-MM' for given date or current month */
export function currentMonthKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM')
}

export function reportMonthKey(date: Date = new Date()): string {
  return shiftMonth(currentMonthKey(date), date.getDate() < 8 ? -1 : 0)
}

export function isReportMonthAvailable(
  monthKey: string,
  date: Date = new Date()
): boolean {
  return isCalendarMonthKey(monthKey) && monthKey <= reportMonthKey(date)
}

export function isCalendarMonthKey(monthKey: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)
}

/** Returns 'YYYY-MM-01' for given month key 'YYYY-MM' */
export function firstDayOfMonth(monthKey: string): string {
  return `${monthKey}-01`
}

/** Format month key ('YYYY-MM') to display label in Indonesian */
export function formatMonthLabel(monthKey: string): string {
  const d = parse(monthKey, 'yyyy-MM', new Date())
  return format(d, 'MMMM yyyy', { locale: idLocale })
}

/** Shift month key by n months. 'YYYY-MM' → 'YYYY-MM' */
export function shiftMonth(monthKey: string, delta: number): string {
  const d = parse(monthKey, 'yyyy-MM', new Date())
  d.setMonth(d.getMonth() + delta)
  return format(d, 'yyyy-MM')
}

/** Given an ISO date like '2026-04-01', return 'YYYY-MM' key */
export function monthKeyFromDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}
