import { startOfMonth, endOfMonth, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type {
  AbsenceReasonBreakdownRow,
  AttendanceRecord,
  CategoryBreakdownRow,
  GenderBreakdownRow,
  GroupGenderBreakdownRow,
  MeetingRecap,
  MonthlyFormRecap,
  ParticipantMonthlyRecap,
} from '../types'

type FetchParams = {
  formIds: string[]
  month: Date
}

// Census participant for calculating rates
export type CensusParticipant = {
  id: string
  name: string
  group: string | null
  category: string | null
  gender: 'L' | 'P' | null
}

/**
 * Fetch census participants for allowed categories
 * Census = all active participants in the allowed categories
 */
export async function fetchCensusParticipants(
  allowedCategories: string[],
  kelompokId?: string
): Promise<CensusParticipant[]> {
  let query = supabase
    .from('participants')
    .select(
      `
      id,
      name,
      status_active,
      gender,
      category:lookup_values!participants_category_id_fkey (value),
      group:lookup_values!participants_group_id_fkey (value)
    `
    )
    .eq('status_active', true)

  if (kelompokId) {
    query = query.eq('group_id', kelompokId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  // Filter by allowed categories
  return (data ?? []).reduce<CensusParticipant[]>((participants, row) => {
    const category = row.category as unknown as { value: string } | null
    const group = row.group as unknown as { value: string } | null
    const participant: CensusParticipant = {
      id: row.id,
      name: row.name,
      category: category?.value ?? null,
      group: group?.value ?? null,
      gender: (row.gender ?? null) as 'L' | 'P' | null,
    }
    if (
      participant.category &&
      allowedCategories.includes(participant.category)
    ) {
      participants.push(participant)
    }
    return participants
  }, [])
}

/**
 * Fetch raw attendance records for a specific form and month
 * Includes participant info via joins
 */
export async function fetchMonthlyAttendance({
  formIds,
  month,
}: FetchParams): Promise<AttendanceRecord[]> {
  if (formIds.length === 0) return []

  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const { data, error } = await supabase
    .from('attendance')
    .select(
      `
      id,
      form_id,
      participant_id,
      status,
      timestamp,
      is_pending,
      temp_name,
      temp_category,
      temp_gender,
      permission_reason,
      participants!attendance_participant_id_fkey (
        name,
        gender,
        lookup_values!participants_category_id_fkey (value),
        group:lookup_values!participants_group_id_fkey (value)
      )
    `
    )
    .in('form_id', formIds)
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
      gender: 'L' | 'P' | null
      lookup_values: { value: string } | null
      group: { value: string } | null
    } | null

    const rawGender = participant?.gender ?? (row.temp_gender as string | null)
    const gender_value: 'L' | 'P' | null =
      rawGender === 'L' || rawGender === 'P' ? rawGender : null

    const rawReason = row.permission_reason as string | null
    const permission_reason: 'Sakit' | 'Kerja' | 'Lainnya' | null =
      rawReason === 'Sakit' || rawReason === 'Kerja' || rawReason === 'Lainnya'
        ? rawReason
        : null

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
      gender_value,
      permission_reason,
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
 * - Attendance rate (totals): totalHadir / (totalMeetings * totalCensus) [census-based]
 */
function computeCategoryBreakdown(
  records: AttendanceRecord[],
  census: CensusParticipant[],
  totalMeetings: number
): CategoryBreakdownRow[] {
  const censusByCategory = new Map<string, number>()
  for (const p of census) {
    if (!p.category) continue
    censusByCategory.set(
      p.category,
      (censusByCategory.get(p.category) ?? 0) + 1
    )
  }

  const hadirByCategory = new Map<string, number>()
  for (const r of records) {
    if (r.status !== 'HADIR') continue
    const category = r.category_value ?? 'Lainnya'
    hadirByCategory.set(category, (hadirByCategory.get(category) ?? 0) + 1)
  }

  const allCategories = new Set([
    ...censusByCategory.keys(),
    ...hadirByCategory.keys(),
  ])

  const rows: CategoryBreakdownRow[] = []
  for (const category of allCategories) {
    const hadirCount = hadirByCategory.get(category) ?? 0
    const totalSensus = censusByCategory.get(category) ?? 0
    const denom = totalSensus * totalMeetings
    const percentage = denom > 0 ? (hadirCount / denom) * 100 : 0
    rows.push({ category, hadirCount, totalSensus, percentage })
  }

  rows.sort((a, b) => b.hadirCount - a.hadirCount)
  return rows
}

function computeGenderBreakdown(
  records: AttendanceRecord[],
  census: CensusParticipant[],
  totalMeetings: number
): GenderBreakdownRow[] {
  const censusByGender = { L: 0, P: 0, Unknown: 0 }
  for (const p of census) {
    if (p.gender === 'L') censusByGender.L++
    else if (p.gender === 'P') censusByGender.P++
    else censusByGender.Unknown++
  }

  const hadirByGender = { L: 0, P: 0, Unknown: 0 }
  for (const r of records) {
    if (r.status !== 'HADIR') continue
    if (r.gender_value === 'L') hadirByGender.L++
    else if (r.gender_value === 'P') hadirByGender.P++
    else hadirByGender.Unknown++
  }

  const buckets: Array<'L' | 'P' | 'Unknown'> = ['L', 'P', 'Unknown']
  return buckets.reduce<GenderBreakdownRow[]>((rows, gender) => {
    const hadirCount = hadirByGender[gender]
    const totalSensus = censusByGender[gender]
    if (gender === 'Unknown' && hadirCount === 0 && totalSensus === 0) {
      return rows
    }
    const denom = totalSensus * totalMeetings
    rows.push({
      gender,
      hadirCount,
      totalSensus,
      percentage: denom > 0 ? (hadirCount / denom) * 100 : 0,
    })
    return rows
  }, [])
}

function computeAbsenceReasonBreakdown(
  records: AttendanceRecord[],
  totalCensus: number,
  totalMeetings: number
): AbsenceReasonBreakdownRow[] {
  const counts = { Sakit: 0, Kerja: 0, Lainnya: 0 }
  let totalIzin = 0
  let totalHadir = 0

  for (const r of records) {
    if (r.status === 'HADIR') {
      totalHadir++
      continue
    }
    if (r.status === 'IZIN') {
      totalIzin++
      const reason = r.permission_reason
      if (reason === 'Sakit') counts.Sakit++
      else if (reason === 'Kerja') counts.Kerja++
      else counts.Lainnya++
    }
  }

  const expectedSlots = totalCensus * totalMeetings
  const filledSlots = totalHadir + totalIzin
  const alpa = Math.max(0, expectedSlots - filledSlots)

  // Total denominator is now expected slots (census * meetings), not just absences.
  // This makes Hadir + all absence reasons sum to ~100%.
  const total = totalHadir + counts.Sakit + counts.Kerja + counts.Lainnya + alpa
  if (total === 0) return []

  const pct = (n: number) => (n / total) * 100

  return [
    { reason: 'Hadir', count: totalHadir, percentage: pct(totalHadir) },
    { reason: 'Sakit', count: counts.Sakit, percentage: pct(counts.Sakit) },
    { reason: 'Kerja', count: counts.Kerja, percentage: pct(counts.Kerja) },
    {
      reason: 'Lainnya',
      count: counts.Lainnya,
      percentage: pct(counts.Lainnya),
    },
    { reason: 'Alpa', count: alpa, percentage: pct(alpa) },
  ]
}

function computeByGroupGender(
  records: AttendanceRecord[],
  census: CensusParticipant[],
  totalMeetings: number
): GroupGenderBreakdownRow[] {
  type Bucket = {
    censusL: number
    censusP: number
    hadirL: number
    hadirP: number
  }
  const byGroup = new Map<string, Bucket>()

  const ensure = (group: string): Bucket => {
    let b = byGroup.get(group)
    if (!b) {
      b = { censusL: 0, censusP: 0, hadirL: 0, hadirP: 0 }
      byGroup.set(group, b)
    }
    return b
  }

  for (const p of census) {
    const group = p.group?.trim() || 'Unknown'
    const b = ensure(group)
    if (p.gender === 'L') b.censusL++
    else if (p.gender === 'P') b.censusP++
  }

  for (const r of records) {
    if (r.status !== 'HADIR') continue
    const group = r.group_value?.trim() || 'Unknown'
    const b = ensure(group)
    if (r.gender_value === 'L') b.hadirL++
    else if (r.gender_value === 'P') b.hadirP++
  }

  const rows: GroupGenderBreakdownRow[] = []
  for (const [group, b] of byGroup) {
    const censusTotal = b.censusL + b.censusP
    const hadirTotal = b.hadirL + b.hadirP
    const denom = censusTotal * totalMeetings
    const percentage = denom > 0 ? (hadirTotal / denom) * 100 : 0
    rows.push({
      group,
      censusL: b.censusL,
      censusP: b.censusP,
      censusTotal,
      hadirL: b.hadirL,
      hadirP: b.hadirP,
      hadirTotal,
      percentage,
    })
  }

  rows.sort((a, b) => b.percentage - a.percentage)
  return rows
}

export function aggregateMonthlyRecap(
  records: AttendanceRecord[],
  month: Date,
  censusParticipants: CensusParticipant[] = [],
  options: { totalMeetings?: number } = {}
): MonthlyFormRecap {
  const monthKey = format(month, 'yyyy-MM')
  const totalCensus = censusParticipants.length
  const censusByGroup: Record<string, number> = {}

  for (const participant of censusParticipants) {
    const group = participant.group?.trim() || 'Unknown'
    censusByGroup[group] = (censusByGroup[group] ?? 0) + 1
  }

  // Build census lookup map for participant info
  const censusMap = new Map<string, CensusParticipant>()
  for (const p of censusParticipants) {
    censusMap.set(p.id, p)
  }

  if (records.length === 0) {
    const totalMeetings = options.totalMeetings ?? 0
    return {
      monthKey,
      meetings: [],
      participants: [],
      censusByGroup,
      byCategory: computeCategoryBreakdown(
        [],
        censusParticipants,
        totalMeetings
      ),
      byGender: computeGenderBreakdown([], censusParticipants, totalMeetings),
      byAbsenceReason: computeAbsenceReasonBreakdown(
        [],
        totalCensus,
        totalMeetings
      ),
      byGroupGender: computeByGroupGender(
        [],
        censusParticipants,
        totalMeetings
      ),
      totals: {
        totalMeetings,
        totalHadir: 0,
        totalIzin: 0,
        totalSubmissions: 0,
        totalCensus,
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

  const totalMeetings = options.totalMeetings ?? meetings.length

  // Group by participant
  const byParticipant = new Map<
    string,
    {
      name: string
      group: string | null
      category: string | null
      hadir: number
      izin: number
    }
  >()

  for (const rec of records) {
    // Use participant_id if available, otherwise temp_name as key
    const key = rec.participant_id ?? `temp_${rec.temp_name}`
    if (!key) continue

    if (!byParticipant.has(key)) {
      // Get category from census map if available
      const censusInfo = rec.participant_id
        ? censusMap.get(rec.participant_id)
        : null
      byParticipant.set(key, {
        name: rec.participant_name ?? 'Unknown',
        group: censusInfo?.group ?? rec.group_value,
        category: censusInfo?.category ?? rec.category_value,
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
      participantCategory: data.category,
      hadirCount: data.hadir,
      izinCount: data.izin,
      totalCount,
      // Meeting-based: how many meetings did they attend?
      attendanceRate: totalMeetings > 0 ? data.hadir / totalMeetings : 0,
      izinRate: totalMeetings > 0 ? data.izin / totalMeetings : 0,
    })
  }
  // Sort by attendance rate ascending (worst first for follow-up)
  participants.sort((a, b) => a.attendanceRate - b.attendanceRate)

  // Totals
  const totalHadir = records.filter((r) => r.status === 'HADIR').length
  const totalIzin = records.filter((r) => r.status === 'IZIN').length
  const totalSubmissions = records.length

  // Census-based rate calculation: totalHadir / (totalMeetings * totalCensus)
  const maxPossibleAttendance = totalMeetings * totalCensus

  return {
    monthKey,
    meetings,
    participants,
    censusByGroup,
    byCategory: computeCategoryBreakdown(
      records,
      censusParticipants,
      totalMeetings
    ),
    byGender: computeGenderBreakdown(
      records,
      censusParticipants,
      totalMeetings
    ),
    byAbsenceReason: computeAbsenceReasonBreakdown(
      records,
      totalCensus,
      totalMeetings
    ),
    byGroupGender: computeByGroupGender(
      records,
      censusParticipants,
      totalMeetings
    ),
    totals: {
      totalMeetings,
      totalHadir,
      totalIzin,
      totalSubmissions,
      totalCensus,
      attendanceRate:
        maxPossibleAttendance > 0 ? totalHadir / maxPossibleAttendance : 0,
      izinRate:
        maxPossibleAttendance > 0 ? totalIzin / maxPossibleAttendance : 0,
      avgHadirPerMeeting: totalMeetings > 0 ? totalHadir / totalMeetings : 0,
    },
  }
}
