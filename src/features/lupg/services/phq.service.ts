import { format, parse } from 'date-fns'
import { supabase } from '@/lib/supabase'
import {
  type AttendanceStatus,
  type PhqAttendanceRow,
  type PhqMeetingRow,
  type PhqMonthlyNoteRow,
  type PhqParticipantRow,
  type PhqProgressRow,
  type PhqSummaryRow,
} from '../types'

const DATE_FORMAT = 'yyyy-MM-dd'
const toDateOnly = (date: Date) => format(date, DATE_FORMAT)
const monthDateOnly = (month: string) =>
  toDateOnly(parse(month, 'yyyy-MM', new Date()))
const PHQ_PARTICIPANT_COLUMNS =
  'id, kelompok_id, name, category_code, gender, status_active, birth_date, highest_juz, highest_surat, highest_ayat_from, highest_ayat_to, highest_juz_mastery_percent, created_at, updated_at'
const PHQ_MEETING_COLUMNS =
  'id, kelompok_id, activity_date, month, notes, created_at, updated_at'
const PHQ_PROGRESS_COLUMNS =
  'id, participant_id, meeting_id, score, juz, juz_mastery_percent, surat, ayat_from, ayat_to, notes, created_at, updated_at'
const PHQ_ATTENDANCE_COLUMNS =
  'id, participant_id, meeting_id, status, notes, created_at, updated_at'
const PHQ_MONTHLY_NOTE_COLUMNS =
  'id, kelompok_id, month, notes, created_at, updated_at'

export async function listPhqParticipants(kelompokId: string) {
  const { data, error } = await supabase
    .from('lupg_phq_participants')
    .select(PHQ_PARTICIPANT_COLUMNS)
    .eq('kelompok_id', kelompokId)
    .order('status_active', { ascending: false })
    .order('name')
  if (error) throw error
  return (data ?? []) as PhqParticipantRow[]
}

export async function createPhqParticipant(
  input: Omit<
    PhqParticipantRow,
    'id' | 'created_at' | 'updated_at' | 'birth_date'
  > & {
    birth_date?: Date | null
  }
) {
  const { birth_date, ...values } = input
  const { data, error } = await supabase
    .from('lupg_phq_participants')
    .insert({
      ...values,
      birth_date: birth_date ? toDateOnly(birth_date) : null,
    })
    .select(PHQ_PARTICIPANT_COLUMNS)
    .single()
  if (error) throw error
  return data as PhqParticipantRow
}

export async function updatePhqParticipant(
  id: string,
  patch: Omit<
    Partial<PhqParticipantRow>,
    'id' | 'kelompok_id' | 'created_at' | 'updated_at' | 'birth_date'
  > & { birth_date?: Date | null }
) {
  const { birth_date, ...values } = patch
  const { data, error } = await supabase
    .from('lupg_phq_participants')
    .update({
      ...values,
      ...(birth_date === undefined
        ? {}
        : { birth_date: birth_date ? toDateOnly(birth_date) : null }),
    })
    .eq('id', id)
    .select(PHQ_PARTICIPANT_COLUMNS)
    .single()
  if (error) throw error
  return data as PhqParticipantRow
}

export async function deletePhqParticipant(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_phq_participants')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listPhqMeetings(kelompokId: string, month: string) {
  const { data, error } = await supabase
    .from('lupg_phq_meetings')
    .select(PHQ_MEETING_COLUMNS)
    .eq('kelompok_id', kelompokId)
    .eq('month', monthDateOnly(month))
    .order('activity_date')
  if (error) throw error
  return (data ?? []) as PhqMeetingRow[]
}

export async function createPhqMeeting(input: {
  kelompok_id: string
  activity_date: Date
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('lupg_phq_meetings')
    .insert({ ...input, activity_date: toDateOnly(input.activity_date) })
    .select(PHQ_MEETING_COLUMNS)
    .single()
  if (error) throw error
  return data as PhqMeetingRow
}

export async function updatePhqMeeting(
  id: string,
  patch: { activity_date?: Date; notes?: string | null }
) {
  const { activity_date, ...values } = patch
  const { data, error } = await supabase
    .from('lupg_phq_meetings')
    .update({
      ...values,
      ...(activity_date ? { activity_date: toDateOnly(activity_date) } : {}),
    })
    .eq('id', id)
    .select(PHQ_MEETING_COLUMNS)
    .single()
  if (error) throw error
  return data as PhqMeetingRow
}

export async function deletePhqMeeting(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_phq_meetings')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listPhqProgress(meetingIds: readonly string[]) {
  if (!meetingIds.length) return [] as PhqProgressRow[]
  const { data, error } = await supabase
    .from('lupg_phq_progress')
    .select(PHQ_PROGRESS_COLUMNS)
    .in('meeting_id', meetingIds)
    .order('participant_id')
  if (error) throw error
  return (data ?? []) as PhqProgressRow[]
}

export async function upsertPhqProgress(input: {
  participant_id: string
  meeting_id: string
  score: number
  juz?: number | null
  juz_mastery_percent?: number | null
  surat?: string | null
  ayat_from?: number | null
  ayat_to?: number | null
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('lupg_phq_progress')
    .upsert(input, { onConflict: 'participant_id,meeting_id' })
    .select(PHQ_PROGRESS_COLUMNS)
    .single()
  if (error) throw error
  return data as PhqProgressRow
}

export async function deletePhqProgress(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_phq_progress')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listPhqAttendance(meetingIds: readonly string[]) {
  if (!meetingIds.length) return [] as PhqAttendanceRow[]
  const { data, error } = await supabase
    .from('lupg_phq_attendance')
    .select(PHQ_ATTENDANCE_COLUMNS)
    .in('meeting_id', meetingIds)
    .order('participant_id')
  if (error) throw error
  return (data ?? []) as PhqAttendanceRow[]
}

export async function upsertPhqAttendance(input: {
  participant_id: string
  meeting_id: string
  status: AttendanceStatus
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('lupg_phq_attendance')
    .upsert(input, { onConflict: 'participant_id,meeting_id' })
    .select(PHQ_ATTENDANCE_COLUMNS)
    .single()
  if (error) throw error
  return data as PhqAttendanceRow
}

export async function deletePhqAttendance(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_phq_attendance')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getPhqMonthlyNote(kelompokId: string, month: string) {
  const { data, error } = await supabase
    .from('lupg_phq_monthly_notes')
    .select(PHQ_MONTHLY_NOTE_COLUMNS)
    .eq('kelompok_id', kelompokId)
    .eq('month', monthDateOnly(month))
    .maybeSingle()
  if (error) throw error
  return data as PhqMonthlyNoteRow | null
}

export async function upsertPhqMonthlyNote(input: {
  kelompok_id: string
  month: string
  notes: string
}) {
  const { data, error } = await supabase
    .from('lupg_phq_monthly_notes')
    .upsert(
      { ...input, month: monthDateOnly(input.month) },
      { onConflict: 'kelompok_id,month' }
    )
    .select(PHQ_MONTHLY_NOTE_COLUMNS)
    .single()
  if (error) throw error
  return data as PhqMonthlyNoteRow
}

export async function getPhqSummary(kelompokId: string, month: string) {
  const { data, error } = await supabase
    .from('lupg_phq_summary')
    .select(
      'month, kelompok_id, meeting_count, progressed_participant_count, present_participant_count, average_score'
    )
    .eq('kelompok_id', kelompokId)
    .eq('month', monthDateOnly(month))
    .maybeSingle()
  if (error) throw error
  return data as PhqSummaryRow | null
}
