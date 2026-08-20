import { supabase } from '@/lib/supabase'
import { type DashboardFormItem, type DashboardTab } from '../types'

export async function fetchFormsByType(params: {
  formType: DashboardTab
  kelompokId?: string
}): Promise<DashboardFormItem[]> {
  // Try with kelompok join first
  let query = supabase
    .from('attendance_forms')
    .select(
      '*, kelompok:lookup_values!attendance_forms_kelompok_id_fkey(value)'
    )
    .eq('form_type', params.formType)
    .order('date', { ascending: false })

  if (params.formType === 'kelompok' && params.kelompokId) {
    query = query.eq('kelompok_id', params.kelompokId)
  }

  const { data, error } = await query

  if (error) {
    // Fallback: FK join failed — re-apply same filters on plain select
    let fallbackQuery = supabase
      .from('attendance_forms')
      .select('*')
      .order('date', { ascending: false })

    // Re-apply form_type filter if column exists
    // If column doesn't exist, this will also error — catch and return all
    try {
      fallbackQuery = fallbackQuery.eq('form_type', params.formType)
      if (params.formType === 'kelompok' && params.kelompokId) {
        fallbackQuery = fallbackQuery.eq('kelompok_id', params.kelompokId)
      }
    } catch {
      // form_type column might not exist — just use unfiltered
    }

    const { data: plainData, error: plainError } = await fallbackQuery
    if (plainError) throw plainError

    return (plainData ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      date: row.date as string,
      isActive: row.is_active as boolean,
      formType:
        ((row as Record<string, unknown>).form_type as DashboardTab) ?? 'desa',
      kelompokId:
        ((row as Record<string, unknown>).kelompok_id as string) ?? null,
      kelompokName: null,
    }))
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    isActive: row.is_active as boolean,
    formType: (row.form_type as DashboardTab) ?? 'desa',
    kelompokId: (row.kelompok_id as string) ?? null,
    kelompokName: (row.kelompok as { value: string } | null)?.value ?? null,
  }))
}

export interface KelompokOption {
  id: string
  value: string
}

export async function fetchKelompokOptions(): Promise<KelompokOption[]> {
  const { data, error } = await supabase
    .from('lookup_values')
    .select('id, value')
    .eq('type', 'GROUP')
    .order('value')
  if (error) throw error
  return data ?? []
}
