import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import type {
  AttendanceRecord,
  MeetingRecap,
  MonthlyFormRecap,
  ParticipantMonthlyRecap,
} from '../types'

type FetchParams = {
  formId: string
  month: Date
}

/**
 * Fetch raw attendance records for a specific form and month
 * Includes participant info via joins
 */
export async function fetchMonthlyAttendance({
  formId,
  month,
}: FetchParams): Promise<AttendanceRecord[]> {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      form_id,
      participant_id,
      status,
      timestamp,
      is_pending,
      temp_name,
      temp_category,
      participants!attendance_participant_id_fkey (
        name,
        lookup_values!participants_category_id_fkey (value),
        group:lookup_values!participants_group_id_fkey (value)
      )
    `)
    .eq('form_id', formId)
    .gte('timestamp', start.toISOString())
    .lte('timestamp', end.toISOString())
    .eq('is_pending', false)
    .order('timestamp', { ascending: true })

  if (error) {
    throw error
  }

  // Map to flat structure
  return (data ?? []).map((row) => {
    const participant = row.participants as unknown as {
      name: string
      lookup_values: { value: string } | null
      group: { value: string } | null
    } | null

    return {
      id: row.id,
      form_id: row.form_id,
      participant_id: row.participant_id,
      status: row.status as 'HADIR' | 'IZIN',
      timestamp: row.timestamp,
      is_pending: row.is_pending,
      temp_name: row.temp_name,
      temp_category: row.temp_category,
      participant_name: participant?.name ?? row.temp_name ?? null,
      category_value: participant?.lookup_values?.value ?? null,
      group_value: participant?.group?.value ?? null,
    }
  })
}

/**
 * Aggregate raw attendance records into monthly recap
 * 
 * Aggregation rules:
 * - Meetings: distinct dates from timestamp (truncated to YYYY-MM-DD)
 * - Per meeting: count HADIR vs IZIN
 * - Per participant: count across all meetings
 * - Attendance rate (participant): hadirCount / totalMeetings
 * - Attendance rate (totals): totalHadir / totalSubmissions
 */
export function aggregateMonthlyRecap(
  records: AttendanceRecord[],
  month: Date
): MonthlyFormRecap {
  const monthKey = format(month, 'yyyy-MM')

  if (records.length === 0) {
    return {
      monthKey,
      meetings: [],
      participants: [],
      totals: {
        totalMeetings: 0,
        totalHadir: 0,
        totalIzin: 0,
        totalSubmissions: 0,
        attendanceRate: 0,
        izinRate: 0,
        avgHadirPerMeeting: 0,
      },
    }
  }

  // Group by date (YYYY-MM-DD)
  const byDate = new Map<string, AttendanceRecord[]>()
  for (const rec of records) {
    const dateKey = format(new Date(rec.timestamp), 'yyyy-MM-dd')
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, [])
    }
    byDate.get(dateKey)!.push(rec)
  }

  // Build meetings array
  const meetings: MeetingRecap[] = []
  for (const [date, recs] of byDate) {
    const hadir = recs.filter((r) => r.status === 'HADIR').length
    const izin = recs.filter((r) => r.status === 'IZIN').length
    meetings.push({
      date,
      hadir,
      izin,
      totalSubmissions: recs.length,
    })
  }
  meetings.sort((a, b) => a.date.localeCompare(b.date))

  const totalMeetings = meetings.length

  // Group by participant
  const byParticipant = new Map<
    string,
    {
      name: string
      group: string | null
      hadir: number
      izin: number
    }
  >()

  for (const rec of records) {
    // Use participant_id if available, otherwise temp_name as key
    const key = rec.participant_id ?? `temp_${rec.temp_name}`
    if (!key) continue

    if (!byParticipant.has(key)) {
      byParticipant.set(key, {
        name: rec.participant_name ?? 'Unknown',
        group: rec.group_value,
        hadir: 0,
        izin: 0,
      })
    }

    const p = byParticipant.get(key)!
    if (rec.status === 'HADIR') {
      p.hadir++
    } else {
      p.izin++
    }
  }

  // Build participants array
  const participants: ParticipantMonthlyRecap[] = []
  for (const [id, data] of byParticipant) {
    const totalCount = data.hadir + data.izin
    participants.push({
      participantId: id,
      participantName: data.name,
      participantGroup: data.group,
      hadirCount: data.hadir,
      izinCount: data.izin,
      totalCount,
      // Meeting-based: how many meetings did they attend?
      attendanceRate: totalMeetings > 0 ? data.hadir / totalMeetings : 0,
    })
  }
  // Sort by attendance rate ascending (worst first for follow-up)
  participants.sort((a, b) => a.attendanceRate - b.attendanceRate)

  // Totals
  const totalHadir = records.filter((r) => r.status === 'HADIR').length
  const totalIzin = records.filter((r) => r.status === 'IZIN').length
  const totalSubmissions = records.length

  return {
    monthKey,
    meetings,
    participants,
    totals: {
      totalMeetings,
      totalHadir,
      totalIzin,
      totalSubmissions,
      attendanceRate: totalSubmissions > 0 ? totalHadir / totalSubmissions : 0,
      izinRate: totalSubmissions > 0 ? totalIzin / totalSubmissions : 0,
      avgHadirPerMeeting: totalMeetings > 0 ? totalHadir / totalMeetings : 0,
    },
  }
}
