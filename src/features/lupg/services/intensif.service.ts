import { addMonths, format, parse } from 'date-fns'
import { supabase } from '@/lib/supabase'
import {
  type AttendanceStatus,
  type IntensifActivityRow,
  type IntensifAttendanceRow,
  type IntensifProgramCode,
  type IntensifSummaryRow,
} from '../types'

const DATE_FORMAT = 'yyyy-MM-dd'
const toDateOnly = (date: Date) => format(date, DATE_FORMAT)
const monthDateOnly = (month: string) =>
  toDateOnly(parse(month, 'yyyy-MM', new Date()))
const INTENSIF_ACTIVITY_COLUMNS =
  'id, program_code, kelompok_id, activity_date, notes, created_at, updated_at'
const INTENSIF_ATTENDANCE_COLUMNS =
  'id, activity_id, participant_id, participant_name, participant_gender, participant_category_code, status, notes, created_at, updated_at'

export async function listIntensifActivities(
  program: IntensifProgramCode,
  kelompokId: string | undefined,
  month: string
) {
  let query = supabase
    .from('lupg_intensif_activities')
    .select(INTENSIF_ACTIVITY_COLUMNS)
    .eq('program_code', program)
    .gte('activity_date', monthDateOnly(month))
    .lt(
      'activity_date',
      format(addMonths(parse(month, 'yyyy-MM', new Date()), 1), 'yyyy-MM-dd')
    )
    .order('activity_date')
  if (kelompokId) query = query.eq('kelompok_id', kelompokId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as IntensifActivityRow[]
}

export async function createIntensifActivity(input: {
  program_code: IntensifProgramCode
  kelompok_id: string
  activity_date: Date
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('lupg_intensif_activities')
    .insert({ ...input, activity_date: toDateOnly(input.activity_date) })
    .select(INTENSIF_ACTIVITY_COLUMNS)
    .single()
  if (error) throw error
  return data as IntensifActivityRow
}

export async function updateIntensifActivity(
  id: string,
  patch: { activity_date?: Date; notes?: string | null }
) {
  const { activity_date, ...values } = patch
  const { data, error } = await supabase
    .from('lupg_intensif_activities')
    .update({
      ...values,
      ...(activity_date ? { activity_date: toDateOnly(activity_date) } : {}),
    })
    .eq('id', id)
    .select(INTENSIF_ACTIVITY_COLUMNS)
    .single()
  if (error) throw error
  return data as IntensifActivityRow
}

export async function deleteIntensifActivity(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_intensif_activities')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listIntensifAttendance(activityIds: readonly string[]) {
  if (!activityIds.length) return [] as IntensifAttendanceRow[]
  const { data, error } = await supabase
    .from('lupg_intensif_attendance')
    .select(INTENSIF_ATTENDANCE_COLUMNS)
    .in('activity_id', activityIds)
    .order('participant_name')
  if (error) throw error
  return (data ?? []) as IntensifAttendanceRow[]
}

export async function upsertIntensifAttendance(input: {
  activity_id: string
  participant_id: string
  status: AttendanceStatus
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('lupg_intensif_attendance')
    .upsert(input, { onConflict: 'activity_id,participant_id' })
    .select(INTENSIF_ATTENDANCE_COLUMNS)
    .single()
  if (error) throw error
  return data as IntensifAttendanceRow
}

export async function deleteIntensifAttendance(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_intensif_attendance')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listIntensifCandidates(
  program: IntensifProgramCode,
  kelompokId: string
) {
  const { data, error } = await supabase.rpc('list_lupg_intensif_candidates', {
    p_program_code: program,
    p_kelompok_id: kelompokId,
  })
  if (error) throw error
  return (data ?? []) as Array<{
    birth_date: string | null
    birth_place: string | null
    category_code: string
    id: string
    kelompok_id: string
    name: string
    gender: string
    status_active: boolean
  }>
}

export async function updateIntensifParticipant(input: {
  id: string
  name: string
  gender: string
  categoryCode: string
  birthDate: Date | null
  birthPlace: string
  statusActive: boolean
}) {
  const { data, error } = await supabase.rpc(
    'update_lupg_intensif_participant',
    {
      p_participant_id: input.id,
      p_name: input.name,
      p_gender: input.gender,
      p_category_code: input.categoryCode,
      p_birth_date: input.birthDate ? toDateOnly(input.birthDate) : null,
      p_birth_place: input.birthPlace,
      p_status_active: input.statusActive,
    }
  )
  if (error) throw error
  return data?.[0] ?? null
}

export async function getIntensifSummary(
  program: IntensifProgramCode,
  kelompokId: string,
  month: string
) {
  const { data, error } = await supabase
    .from('lupg_intensif_summary')
    .select(
      'program_code, month, kelompok_id, activity_count, present_participant_count'
    )
    .eq('program_code', program)
    .eq('kelompok_id', kelompokId)
    .eq('month', monthDateOnly(month))
    .maybeSingle()
  if (error) throw error
  return data as IntensifSummaryRow | null
}
