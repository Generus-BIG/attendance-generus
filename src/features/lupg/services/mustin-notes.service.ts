import { supabase } from '@/lib/supabase'
import { type MustinNoteRow, type MustinStatus } from '../types'

export async function listMustinNotes(
  monthlyReportId: string
): Promise<MustinNoteRow[]> {
  const { data, error } = await supabase
    .from('lupg_mustin_notes')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as MustinNoteRow[]
}

export async function createMustinNote(input: {
  monthly_report_id: string
  sort_order?: number
  pokok_masalah: string
  keputusan_rencana: string
  pic?: string | null
  deadline?: string | null
  status?: MustinStatus
}): Promise<MustinNoteRow> {
  const { data, error } = await supabase
    .from('lupg_mustin_notes')
    .insert({
      monthly_report_id: input.monthly_report_id,
      sort_order: input.sort_order ?? 100,
      pokok_masalah: input.pokok_masalah,
      keputusan_rencana: input.keputusan_rencana,
      pic: input.pic ?? null,
      deadline: input.deadline ?? null,
      status: input.status ?? 'open',
    })
    .select()
    .single()
  if (error) throw error
  return data as MustinNoteRow
}

export async function updateMustinNote(
  id: string,
  patch: Partial<{
    sort_order: number
    pokok_masalah: string
    keputusan_rencana: string
    pic: string | null
    deadline: string | null
    status: MustinStatus
  }>
): Promise<MustinNoteRow> {
  const { data, error } = await supabase
    .from('lupg_mustin_notes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as MustinNoteRow
}

export async function deleteMustinNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_mustin_notes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listOpenMustinNotes(params?: {
  kelompokId?: string
}): Promise<
  (MustinNoteRow & { kelompok_id: string; month: string })[]
> {
  let q = supabase
    .from('lupg_mustin_notes')
    .select(
      '*, monthly_report:lupg_monthly_reports!inner(kelompok_id, month)'
    )
    .in('status', ['open', 'in_progress'])
    .order('deadline', { ascending: true, nullsFirst: false })

  if (params?.kelompokId) {
    q = q.eq('monthly_report.kelompok_id', params.kelompokId)
  }

  const { data, error } = await q
  if (error) throw error
  type JoinRow = MustinNoteRow & {
    monthly_report: { kelompok_id: string; month: string }
  }
  return ((data ?? []) as JoinRow[]).map((row) => ({
    ...row,
    kelompok_id: row.monthly_report.kelompok_id,
    month: row.monthly_report.month,
  }))
}
