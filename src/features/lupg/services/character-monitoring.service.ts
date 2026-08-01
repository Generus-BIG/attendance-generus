import { supabase } from '@/lib/supabase'
import {
  type CharacterMonitoringActivityInsert,
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringActivityUpdate,
  type CharacterMonitoringReportRow,
  type CharacterMonitoringStatus,
} from '../types'

export async function listActiveCharacterMonitoringActivities(): Promise<
  CharacterMonitoringActivityRow[]
> {
  const { data, error } = await supabase
    .from('lupg_character_monitoring_activities')
    .select('*')
    .eq('active', true)
    .order('level_code')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as CharacterMonitoringActivityRow[]
}

export async function listAllCharacterMonitoringActivities(): Promise<
  CharacterMonitoringActivityRow[]
> {
  const { data, error } = await supabase
    .from('lupg_character_monitoring_activities')
    .select('*')
    .order('level_code')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as CharacterMonitoringActivityRow[]
}

export async function createCharacterMonitoringActivity(
  input: CharacterMonitoringActivityInsert
): Promise<CharacterMonitoringActivityRow> {
  const { data, error } = await supabase
    .from('lupg_character_monitoring_activities')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as CharacterMonitoringActivityRow
}

export async function updateCharacterMonitoringActivity(
  id: string,
  patch: CharacterMonitoringActivityUpdate
): Promise<CharacterMonitoringActivityRow> {
  const { data, error } = await supabase
    .from('lupg_character_monitoring_activities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CharacterMonitoringActivityRow
}

export async function deleteCharacterMonitoringActivity(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('lupg_character_monitoring_activities')
    .update({ active: false })
    .eq('id', id)
  if (error) throw error
}

export async function listCharacterMonitoringReports(
  monthlyReportId: string
): Promise<CharacterMonitoringReportRow[]> {
  const { data, error } = await supabase
    .from('lupg_character_monitoring_reports')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
  if (error) throw error
  return (data ?? []) as CharacterMonitoringReportRow[]
}

export async function listCharacterMonitoringReportsBatch(
  monthlyReportIds: string[]
): Promise<CharacterMonitoringReportRow[]> {
  if (monthlyReportIds.length === 0) return []

  const { data, error } = await supabase
    .from('lupg_character_monitoring_reports')
    .select('*')
    .in('monthly_report_id', monthlyReportIds)
  if (error) throw error
  return (data ?? []) as CharacterMonitoringReportRow[]
}

export async function upsertCharacterMonitoringReport(input: {
  monthly_report_id: string
  activity_id: string
  status: CharacterMonitoringStatus | null
  notes?: string | null
}): Promise<CharacterMonitoringReportRow> {
  const { data, error } = await supabase
    .from('lupg_character_monitoring_reports')
    .upsert(
      {
        monthly_report_id: input.monthly_report_id,
        activity_id: input.activity_id,
        status: input.status,
        notes: input.notes ?? null,
      },
      { onConflict: 'monthly_report_id,activity_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as CharacterMonitoringReportRow
}

export async function upsertCharacterMonitoringReports(
  inputs: Array<{
    monthly_report_id: string
    activity_id: string
    status: Exclude<CharacterMonitoringStatus, 'needs_guidance'>
  }>
): Promise<CharacterMonitoringReportRow[]> {
  if (inputs.length === 0) return []

  const { data, error } = await supabase
    .from('lupg_character_monitoring_reports')
    .upsert(inputs, { onConflict: 'monthly_report_id,activity_id' })
    .select()
  if (error) throw error
  return (data ?? []) as CharacterMonitoringReportRow[]
}
