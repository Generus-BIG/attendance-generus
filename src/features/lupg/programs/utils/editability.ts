import { type Role } from '@/lib/rbac'
import { type MonthlyReportRow } from '../../types'

export interface EditabilityResult {
  editable: boolean
  reason?: string
}

/**
 * A month's program row is editable iff:
 * - month <= currentMonth (no future editing)
 * - user is admin/super_admin OR (user is team_manager AND owns the kelompok AND associated monthly_report not locked)
 */
export function isMonthEditable(
  monthKey: string,
  currentMonthKey: string,
  monthlyReport: MonthlyReportRow | undefined,
  userRole: Role,
  userOwnsKelompok: boolean
): EditabilityResult {
  if (monthKey > currentMonthKey) {
    return { editable: false, reason: 'Belum bisa diisi (bulan depan)' }
  }
  const isAdmin = userRole === 'super_admin' || userRole === 'admin'
  if (!isAdmin && !userOwnsKelompok) {
    return { editable: false, reason: 'Tidak punya akses' }
  }
  if (monthlyReport?.locked && !isAdmin) {
    return {
      editable: false,
      reason: `Laporan ${monthKey} sudah disubmit`,
    }
  }
  return { editable: true }
}

export type Quarter = 1 | 2 | 3 | 4

export const QUARTER_START_MONTH: Record<Quarter, number> = {
  1: 1,
  2: 4,
  3: 7,
  4: 10,
}

export const QUARTER_END_MONTH: Record<Quarter, number> = {
  1: 3,
  2: 6,
  3: 9,
  4: 12,
}

export const QUARTER_LABEL: Record<Quarter, string> = {
  1: 'Q1 (Jan-Mar)',
  2: 'Q2 (Apr-Jun)',
  3: 'Q3 (Jul-Sep)',
  4: 'Q4 (Oct-Dec)',
}

export function getQuarterEndMonthKey(quarter: Quarter, year: number): string {
  return `${year}-${QUARTER_END_MONTH[quarter].toString().padStart(2, '0')}`
}

export function getQuarterStartMonthKey(
  quarter: Quarter,
  year: number
): string {
  return `${year}-${QUARTER_START_MONTH[quarter].toString().padStart(2, '0')}`
}

/**
 * Quarter is editable iff currentMonth >= quarter start month AND the report
 * is not locked (for non-admin). We check editability against the quarter's
 * START month (not end), so e.g. Q2 becomes fillable in April — users should
 * not have to wait until the final month of the quarter to enter data.
 */
export function isQuarterEditable(
  quarter: Quarter,
  year: number,
  currentMonthKey: string,
  endMonthReport: MonthlyReportRow | undefined,
  userRole: Role,
  userOwnsKelompok: boolean
): EditabilityResult {
  const startKey = getQuarterStartMonthKey(quarter, year)
  if (currentMonthKey < startKey) {
    return { editable: false, reason: `Q${quarter} belum mulai` }
  }
  return isMonthEditable(
    startKey,
    currentMonthKey,
    endMonthReport,
    userRole,
    userOwnsKelompok
  )
}

/**
 * Build a list of 12 month keys for a given year: '2026-01' .. '2026-12'.
 */
export function allMonthKeysForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mm = (i + 1).toString().padStart(2, '0')
    return `${year}-${mm}`
  })
}

export const MONTH_NAMES_ID: string[] = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export function monthNameFromKey(monthKey: string): string {
  const month = parseInt(monthKey.slice(5, 7), 10)
  return MONTH_NAMES_ID[month - 1] ?? monthKey
}
