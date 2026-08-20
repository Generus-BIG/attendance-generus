import { type AttendanceStatus, type HafalanPredicate } from '../types'

export function getHafalanPredicate(score: number): HafalanPredicate {
  if (score >= 90) return 'Mumtaz'
  if (score >= 80) return 'Jayyid Jiddan'
  if (score >= 70) return 'Jayyid'
  if (score >= 60) return 'Maqbul'
  return 'Dhaif'
}

export function calculateAttendancePercent(
  statuses: readonly AttendanceStatus[],
  meetingCount = statuses.length
): number {
  return meetingCount
    ? (statuses.filter((status) => status === 'hadir').length / meetingCount) *
        100
    : 0
}

export function calculateAverageAttendancePercent(
  rows: readonly { attendance: number; meetingCount: number }[]
): number | null {
  const eligible = rows.filter((row) => row.meetingCount > 0)
  return eligible.length
    ? eligible.reduce((sum, row) => sum + row.attendance, 0) / eligible.length
    : null
}
