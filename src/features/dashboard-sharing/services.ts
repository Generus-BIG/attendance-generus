import { supabase } from '@/lib/supabase'
import {
  DEFAULT_PUBLIC_DASHBOARD_SECTIONS,
  type DashboardShareConfig,
  type PublicDashboardVisibleSections,
  type UpsertDashboardShareInput,
} from './types'

type DashboardShareRow = {
  id: string
  name: string
  token: string
  is_active: boolean
  scope: 'desa'
  form_mode: 'all' | 'selected'
  form_ids: string[] | null
  visible_sections: Partial<PublicDashboardVisibleSections> | null
  created_at: string
  updated_at: string
}

function mapRow(row: DashboardShareRow): DashboardShareConfig {
  return {
    id: row.id,
    name: row.name,
    token: row.token,
    isActive: row.is_active,
    scope: row.scope,
    formMode: row.form_mode,
    formIds: row.form_ids ?? [],
    visibleSections: {
      ...DEFAULT_PUBLIC_DASHBOARD_SECTIONS,
      ...(row.visible_sections ?? {}),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchDashboardShares(): Promise<DashboardShareConfig[]> {
  const { data, error } = await supabase
    .from('public_dashboard_shares')
    .select('*')
    .eq('scope', 'desa')
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as DashboardShareRow[]).map(mapRow)
}

export async function upsertDashboardShare(
  input: UpsertDashboardShareInput
): Promise<DashboardShareConfig> {
  const payload = {
    id: input.id,
    name: input.name,
    is_active: input.isActive,
    scope: 'desa',
    form_mode: input.formMode,
    form_ids: input.formMode === 'selected' ? input.formIds : [],
    visible_sections: input.visibleSections,
  }

  const { data, error } = await supabase
    .from('public_dashboard_shares')
    .upsert(payload)
    .select('*')
    .single()

  if (error) throw error
  return mapRow(data as DashboardShareRow)
}

export async function deleteDashboardShare(id: string): Promise<void> {
  const { error } = await supabase
    .from('public_dashboard_shares')
    .delete()
    .eq('id', id)

  if (error) throw error
}
