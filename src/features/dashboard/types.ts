import { type PERMISSION_REASONS } from '@/lib/schema'

type PermissionReason = (typeof PERMISSION_REASONS)[number]

export type DashboardTab = 'desa' | 'kelompok'

export interface DashboardFormItem {
  id: string
  title: string
  date: string
  isActive: boolean
  formType: DashboardTab
  kelompokId: string | null
  kelompokName: string | null
}

// Attendance status as stored in DB
export type AttendanceStatus = 'HADIR' | 'IZIN'

// Raw attendance record from Supabase
export type AttendanceRecord = {
  id: string
  form_id: string
  participant_id: string | null
  status: AttendanceStatus
  timestamp: string
  is_pending: boolean
  temp_name: string | null
  temp_category: string | null
  participant_name: string | null
  category_value: string | null
  group_value: string | null
  gender_value: 'L' | 'P' | null
  permission_reason: PermissionReason | null
}

// Aggregated meeting recap for a single date
export type MeetingRecap = {
  date: string // YYYY-MM-DD
  hadir: number
  izin: number
  totalSubmissions: number
}

export type CategoryBreakdownRow = {
  category: string
  hadirCount: number
  totalSensus: number
  percentage: number
}

export type GenderBreakdownRow = {
  gender: 'L' | 'P' | 'Unknown'
  hadirCount: number
  totalSensus: number
  percentage: number
}

// Distribution across all attendance outcomes for the month: 'Hadir', the
// three IZIN reasons (from attendance.permission_reason), and 'Alpa'
// (synthetic — computed as census*meetings minus all submitted records).
export type AbsenceReasonBreakdownRow = {
  reason: PermissionReason | 'Alpa' | 'Hadir'
  count: number
  percentage: number
}

// Per-group attendance breakdown by gender for the month.
export type GroupGenderBreakdownRow = {
  group: string
  censusL: number
  censusP: number
  censusTotal: number
  hadirL: number
  hadirP: number
  hadirTotal: number
  // Census-based attendance rate: hadirTotal / (censusTotal * totalMeetings) * 100
  percentage: number
}

// Per-participant monthly recap
export type ParticipantMonthlyRecap = {
  participantId: string
  participantName: string
  participantGroup: string | null
  participantCategory: string | null
  hadirCount: number
  izinCount: number
  totalCount: number
  /** attendanceRate = hadirCount / totalMeetings (meeting-based) */
  attendanceRate: number
  /** izinRate = izinCount / totalMeetings (meeting-based) */
  izinRate: number
}

// Complete monthly form recap
export type MonthlyFormRecap = {
  monthKey: string // YYYY-MM
  meetings: MeetingRecap[]
  participants: ParticipantMonthlyRecap[]
  censusByGroup: Record<string, number>
  byCategory: CategoryBreakdownRow[]
  byGender: GenderBreakdownRow[]
  byAbsenceReason: AbsenceReasonBreakdownRow[]
  byGroupGender: GroupGenderBreakdownRow[]
  totals: {
    totalMeetings: number
    totalHadir: number
    totalIzin: number
    totalSubmissions: number
    /** Census: total participants in allowed categories */
    totalCensus: number
    /** Census-based: totalHadir / (totalMeetings * totalCensus) */
    attendanceRate: number
    /** Census-based: totalIzin / (totalMeetings * totalCensus) */
    izinRate: number
    avgHadirPerMeeting: number
  }
}
