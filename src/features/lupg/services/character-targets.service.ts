import { supabase } from '@/lib/supabase'
import {
  type CharacterMonitoringStatus,
  type CharacterTargetItemInsert,
  type CharacterTargetItemRow,
  type CharacterTargetItemUpdate,
  type CharacterTargetReportRow,
  type CharacterTargetTemplateInsert,
  type CharacterTargetTemplateRow,
  type CharacterTargetTemplateUpdate,
} from '../types'

export async function listCharacterTargetTemplates(): Promise<
  CharacterTargetTemplateRow[]
> {
  const { data, error } = await supabase
    .from('lupg_character_target_templates')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CharacterTargetTemplateRow[]
}

export async function getActiveCharacterTargetTemplate(
  year: number,
  levelCode?: CharacterTargetTemplateRow['level_code']
): Promise<CharacterTargetTemplateRow | null> {
  let query = supabase
    .from('lupg_character_target_templates')
    .select('*')
    .eq('year', year)
    .eq('status', 'active')
    .order('level_code')
    .limit(1)
  if (levelCode) query = query.eq('level_code', levelCode)

  const { data, error } = await query
  if (error) throw error
  return ((data ?? [])[0] ?? null) as CharacterTargetTemplateRow | null
}

export async function listActiveCharacterTargetTemplates(
  year: number
): Promise<CharacterTargetTemplateRow[]> {
  const { data, error } = await supabase
    .from('lupg_character_target_templates')
    .select('*')
    .eq('year', year)
    .eq('status', 'active')
    .order('level_code')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CharacterTargetTemplateRow[]
}

export async function createCharacterTargetTemplate(
  input: CharacterTargetTemplateInsert
): Promise<CharacterTargetTemplateRow> {
  const { data, error } = await supabase
    .from('lupg_character_target_templates')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as CharacterTargetTemplateRow
}

export async function updateCharacterTargetTemplate(
  id: string,
  patch: CharacterTargetTemplateUpdate
): Promise<CharacterTargetTemplateRow> {
  const { data, error } = await supabase
    .from('lupg_character_target_templates')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CharacterTargetTemplateRow
}

export async function deleteCharacterTargetTemplate(id: string): Promise<void> {
  const { data: template, error: templateError } = await supabase
    .from('lupg_character_target_templates')
    .select('source_file_path')
    .eq('id', id)
    .maybeSingle()
  if (templateError) throw templateError

  const { data: items, error: itemsError } = await supabase
    .from('lupg_character_target_items')
    .select('id')
    .eq('template_id', id)
  if (itemsError) throw itemsError

  const itemIds = (items ?? []).map((item) => item.id as string)
  if (itemIds.length > 0) {
    const { error: reportsError } = await supabase
      .from('lupg_character_target_reports')
      .delete()
      .in('target_item_id', itemIds)
    if (reportsError) throw reportsError
  }

  const { error: deleteItemsError } = await supabase
    .from('lupg_character_target_items')
    .delete()
    .eq('template_id', id)
  if (deleteItemsError) throw deleteItemsError

  const { error: deleteTemplateError } = await supabase
    .from('lupg_character_target_templates')
    .delete()
    .eq('id', id)
  if (deleteTemplateError) throw deleteTemplateError

  if (template?.source_file_path) {
    await supabase.storage
      .from('lupg-character-targets')
      .remove([template.source_file_path])
  }
}

export async function activateCharacterTargetTemplate(
  template: CharacterTargetTemplateRow
): Promise<CharacterTargetTemplateRow> {
  const { error: archiveError } = await supabase
    .from('lupg_character_target_templates')
    .update({ status: 'archived' })
    .eq('year', template.year)
    .eq('level_code', template.level_code)
    .eq('status', 'active')
    .neq('id', template.id)
  if (archiveError) throw archiveError

  return updateCharacterTargetTemplate(template.id, { status: 'active' })
}

export async function listCharacterTargetItems(
  templateId: string
): Promise<CharacterTargetItemRow[]> {
  const { data, error } = await supabase
    .from('lupg_character_target_items')
    .select('*')
    .eq('template_id', templateId)
    .order('month_index')
    .order('level_code')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as CharacterTargetItemRow[]
}

export async function listActiveCharacterTargetItemsForMonth(
  year: number,
  monthIndex: number
): Promise<{
  template: CharacterTargetTemplateRow | null
  templates: CharacterTargetTemplateRow[]
  items: CharacterTargetItemRow[]
}> {
  const templates = await listActiveCharacterTargetTemplates(year)
  if (templates.length === 0) return { template: null, templates: [], items: [] }
  const templateIds = templates.map((template) => template.id)

  const { data, error } = await supabase
    .from('lupg_character_target_items')
    .select('*')
    .in('template_id', templateIds)
    .eq('month_index', monthIndex)
    .eq('active', true)
    .order('level_code')
    .order('category_label')
    .order('sort_order')
  if (error) throw error
  return {
    template: templates[0] ?? null,
    templates,
    items: (data ?? []) as CharacterTargetItemRow[],
  }
}

export async function createCharacterTargetItem(
  input: CharacterTargetItemInsert
): Promise<CharacterTargetItemRow> {
  const { data, error } = await supabase
    .from('lupg_character_target_items')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as CharacterTargetItemRow
}

export async function updateCharacterTargetItem(
  id: string,
  patch: CharacterTargetItemUpdate
): Promise<CharacterTargetItemRow> {
  const { data, error } = await supabase
    .from('lupg_character_target_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CharacterTargetItemRow
}

export async function replaceCharacterTargetItems(
  templateId: string,
  items: CharacterTargetItemInsert[]
): Promise<CharacterTargetItemRow[]> {
  const { error: deleteError } = await supabase
    .from('lupg_character_target_items')
    .delete()
    .eq('template_id', templateId)
  if (deleteError) throw deleteError

  if (items.length === 0) return []

  const { data, error } = await supabase
    .from('lupg_character_target_items')
    .insert(items)
    .select()
  if (error) throw error
  return (data ?? []) as CharacterTargetItemRow[]
}

export async function listCharacterTargetReports(
  monthlyReportId: string
): Promise<CharacterTargetReportRow[]> {
  const { data, error } = await supabase
    .from('lupg_character_target_reports')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
  if (error) throw error
  return (data ?? []) as CharacterTargetReportRow[]
}

export async function listCharacterTargetReportsBatch(
  monthlyReportIds: string[]
): Promise<CharacterTargetReportRow[]> {
  if (monthlyReportIds.length === 0) return []

  const { data, error } = await supabase
    .from('lupg_character_target_reports')
    .select('*')
    .in('monthly_report_id', monthlyReportIds)
  if (error) throw error
  return (data ?? []) as CharacterTargetReportRow[]
}

export async function upsertCharacterTargetReport(input: {
  monthly_report_id: string
  target_item_id: string
  status?: CharacterMonitoringStatus
  discussion_flag?: boolean
  realization_percent?: number | null
  material_gap?: string | null
  reference_from_actual?: string | null
  reference_to_actual?: string | null
  notes?: string | null
}): Promise<CharacterTargetReportRow> {
  const { data, error } = await supabase
    .from('lupg_character_target_reports')
    .upsert(
      {
        monthly_report_id: input.monthly_report_id,
        target_item_id: input.target_item_id,
        status: input.status ?? 'not_observed',
        discussion_flag: input.discussion_flag ?? false,
        realization_percent: input.realization_percent ?? null,
        material_gap: input.material_gap ?? null,
        reference_from_actual: input.reference_from_actual ?? null,
        reference_to_actual: input.reference_to_actual ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: 'monthly_report_id,target_item_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as CharacterTargetReportRow
}
