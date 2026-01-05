/**
 * Dashboard Types for Monthly Form Recap
 * 
 * Form Keys:
 * - profmud: Pengajian GPN Profmud (kategori GPN A + GPN B)
 * - ar: Pengajian AR Intensif (kategori AR)
 */

export type DashboardFormKey = 'profmud' | 'ar'

export type AllowedCategory = 'GPN A' | 'GPN B' | 'AR'

export type DashboardFormConfig = {
  key: DashboardFormKey
  title: string
  description: string
  formId: string
  allowedCategories: AllowedCategory[]
}

/**
 * Form configurations with actual Supabase form IDs
 * These IDs are from attendance_forms table
 */
export const DASHBOARD_FORMS: Record<DashboardFormKey, DashboardFormConfig> = {
  profmud: {
    key: 'profmud',
    title: 'Pengajian GPN Profmud',
    description: 'Rekap bulanan per pertemuan (kategori GPN A & GPN B)',
    formId: 'ead72bcf-128c-4542-8baa-adc11fae27b4',
    allowedCategories: ['GPN A', 'GPN B'],
  },
  ar: {
    key: 'ar',
    title: 'Pengajian AR Intensif',
    description: 'Rekap bulanan per pertemuan (kategori AR)',
    formId: 'f9bb2544-c985-4381-adc5-76b80c93dd4f',
    allowedCategories: ['AR'],
  },
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
}

// Aggregated meeting recap for a single date
export type MeetingRecap = {
  date: string // YYYY-MM-DD
  hadir: number
  izin: number
  totalSubmissions: number
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
