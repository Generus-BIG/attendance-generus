import { format } from 'date-fns'
import {
  attendanceFormConfigSchema,
  KELOMPOK,
  type AttendanceFormConfig,
} from '@/lib/schema'
import { supabase } from '../../lib/supabase'

export type SubmitPendingAttendanceResult =
  | {
      outcome: 'created'
      attendanceId: string
      pendingParticipantId: string
    }
  | {
      outcome: 'appended'
      attendanceId: string
      pendingParticipantId: string
    }
  | {
      outcome: 'duplicate_same_form'
      attendanceId: null
      pendingParticipantId: string
    }

type PendingAttendanceRpcRow = {
  outcome: 'created' | 'appended' | 'duplicate_same_form'
  attendance_id: string | null
  pending_participant_id: string
}

export async function getFormBySlug(
  slug: string
): Promise<AttendanceFormConfig | null> {
  const { data, error } = await supabase
    .from('attendance_forms')
    .select(
      '*, kelompok:lookup_values!attendance_forms_kelompok_id_fkey(value)'
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  const mappedData = {
    ...data,
    isActive: data.is_active,
    allowedCategories: data.allowed_categories || ['A', 'B', 'AR'],
    formType: data.form_type ?? 'desa',
    kelompokId: data.kelompok_id ?? null,
    kelompokName: data.kelompok?.value ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return attendanceFormConfigSchema.parse(mappedData)
}

async function getAttendanceFormScope(formId: string) {
  const { data, error } = await supabase
    .from('attendance_forms')
    .select(
      'form_type, kelompok_id, allowed_categories, kelompok:lookup_values!attendance_forms_kelompok_id_fkey(value)'
    )
    .eq('id', formId)
    .single()

  if (error) throw error

  return data as unknown as {
    form_type: string | null
    kelompok_id: string | null
    allowed_categories: string[] | null
    kelompok: { value: string } | null
  }
}

async function assertAttendanceMatchesFormScope(
  formId: string,
  data: {
    participantId?: string | null
    tempKelompok?: string | null
    tempKategori?: string | null
  }
) {
  const scope = await getAttendanceFormScope(formId)
  const allowedCategories = scope.allowed_categories ?? ['A', 'B', 'AR']

  if (scope.form_type === 'kelompok') {
    const validKelompok = KELOMPOK.some(
      (kelompok) => kelompok === scope.kelompok?.value
    )

    if (!scope.kelompok_id || !scope.kelompok || !validKelompok) {
      throw new Error('Konfigurasi kelompok form tidak valid')
    }
  }

  if (data.participantId) {
    const { data: participant, error } = await supabase
      .from('participants')
      .select('group_id, categories:category_id(value)')
      .eq('id', data.participantId)
      .single()

    if (error) throw error
    if (
      scope.form_type === 'kelompok' &&
      participant?.group_id !== scope.kelompok_id
    ) {
      throw new Error('Peserta tidak sesuai dengan kelompok form')
    }

    const participantCategory = mapDbCategoryToInternal(
      (participant as unknown as { categories?: { value?: string } }).categories
        ?.value ?? ''
    )
    if (!allowedCategories.includes(participantCategory)) {
      throw new Error('Kategori peserta tidak sesuai dengan konfigurasi form')
    }
  }

  if (
    scope.form_type === 'kelompok' &&
    data.tempKelompok &&
    scope.kelompok?.value !== data.tempKelompok
  ) {
    throw new Error('Kelompok tidak sesuai dengan konfigurasi form')
  }

  if (data.tempKategori && !allowedCategories.includes(data.tempKategori)) {
    throw new Error('Kategori tidak sesuai dengan konfigurasi form')
  }
}

export async function submitAttendanceForm(
  formId: string,
  data: {
    participantId?: string | null
    status?: string
    permissionReason?: string | null
    notes?: string | null
    tempName?: string
    tempKelompok?: string
    tempKategori?: string
    tempGender?: string
  }
) {
  const { error } = await supabase.rpc('submit_attendance_guarded', {
    p_form_id: formId,
    p_participant_id: data.participantId || null,
    p_status: data.status ?? null,
    p_permission_reason: data.permissionReason ?? null,
    p_permission_description: data.notes ?? null,
    p_temp_name: data.tempName ?? null,
    p_temp_group: data.tempKelompok ?? null,
    p_temp_category: data.tempKategori ?? null,
    p_temp_gender: data.tempGender ?? null,
  })

  if (error) throw error
}

export async function submitPendingAttendance(
  formId: string,
  data: {
    status: string
    permissionReason?: string
    notes?: string
    tempName: string
    tempKelompok: string
    tempKategori: string
    tempGender: string
    birthPlace: string
    birthDate: Date
  }
): Promise<SubmitPendingAttendanceResult> {
  await assertAttendanceMatchesFormScope(formId, {
    tempKelompok: data.tempKelompok,
    tempKategori: data.tempKategori,
  })

  const { data: rpcRows, error } = await supabase.rpc(
    'submit_pending_attendance_guarded',
    {
      p_form_id: formId,
      p_status: data.status,
      p_permission_reason: data.permissionReason ?? null,
      p_permission_description: data.notes ?? null,
      p_temp_name: data.tempName,
      p_temp_group: data.tempKelompok,
      p_temp_category: data.tempKategori,
      p_temp_gender: data.tempGender,
      p_birth_place: data.birthPlace,
      p_birth_date: format(data.birthDate, 'yyyy-MM-dd'),
    }
  )

  if (error) throw error

  const row = (rpcRows as PendingAttendanceRpcRow[] | null)?.[0]
  if (!row) {
    throw new Error('Respons pendaftaran kosong')
  }

  if (row.outcome === 'duplicate_same_form') {
    return {
      outcome: row.outcome,
      attendanceId: null,
      pendingParticipantId: row.pending_participant_id,
    }
  }

  if (!row.attendance_id) {
    throw new Error('Respons absensi tidak lengkap')
  }

  return {
    outcome: row.outcome,
    attendanceId: row.attendance_id,
    pendingParticipantId: row.pending_participant_id,
  }
}

interface ParticipantSearchResult {
  id: string
  name: string
  gender: string
  group: string
  category: string
}

// Map database category values to internal form values
// Database: "GPN A", "GPN B", "AR" -> Form: "A", "B", "AR"
function mapDbCategoryToInternal(dbCategory: string): string {
  if (dbCategory === 'GPN A') return 'A'
  if (dbCategory === 'GPN B') return 'B'
  if (dbCategory === 'Anak Remaja') return 'AR'
  return dbCategory // "AR" stays as "AR"
}

export async function searchParticipants(
  formId: string,
  query: string
): Promise<ParticipantSearchResult[]> {
  const { data, error } = await supabase.rpc('search_form_participants', {
    p_form_id: formId,
    p_query: query,
  })

  if (error) throw error
  if (!data) return []

  type ParticipantRow = {
    id: string
    name: string
    gender: string
    group_name: string
    category_name: string
  }

  return (data as ParticipantRow[]).map((participant) => ({
    id: participant.id,
    name: participant.name,
    gender: participant.gender,
    group: participant.group_name,
    category: participant.category_name,
  }))
}
