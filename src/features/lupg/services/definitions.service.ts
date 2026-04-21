import { type Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import {
  type ProgramDefinitionRow,
  type MetricDefinitionRow,
  type SarprasItemRow,
} from '../types'

type Tables = Database['public']['Tables']

export async function listActivePrograms(): Promise<ProgramDefinitionRow[]> {
  const { data, error } = await supabase
    .from('lupg_program_definitions')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as ProgramDefinitionRow[]
}

export async function listActiveMetrics(): Promise<MetricDefinitionRow[]> {
  const { data, error } = await supabase
    .from('lupg_metric_definitions')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as MetricDefinitionRow[]
}

export async function listActiveSarprasItems(): Promise<SarprasItemRow[]> {
  const { data, error } = await supabase
    .from('lupg_sarpras_items')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as SarprasItemRow[]
}

// === List ALL (including inactive) ===

export async function listAllPrograms(): Promise<ProgramDefinitionRow[]> {
  const { data, error } = await supabase
    .from('lupg_program_definitions')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as ProgramDefinitionRow[]
}

export async function listAllMetrics(): Promise<MetricDefinitionRow[]> {
  const { data, error } = await supabase
    .from('lupg_metric_definitions')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as MetricDefinitionRow[]
}

export async function listAllSarprasItems(): Promise<SarprasItemRow[]> {
  const { data, error } = await supabase
    .from('lupg_sarpras_items')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as SarprasItemRow[]
}

// === Program CRUD ===

export async function createProgram(
  input: Tables['lupg_program_definitions']['Insert']
): Promise<ProgramDefinitionRow> {
  const { data, error } = await supabase
    .from('lupg_program_definitions')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as ProgramDefinitionRow
}

export async function updateProgram(
  id: string,
  patch: Tables['lupg_program_definitions']['Update']
): Promise<ProgramDefinitionRow> {
  const { data, error } = await supabase
    .from('lupg_program_definitions')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ProgramDefinitionRow
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_program_definitions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// === Metric CRUD ===

export async function createMetric(
  input: Tables['lupg_metric_definitions']['Insert']
): Promise<MetricDefinitionRow> {
  const { data, error } = await supabase
    .from('lupg_metric_definitions')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as MetricDefinitionRow
}

export async function updateMetric(
  id: string,
  patch: Tables['lupg_metric_definitions']['Update']
): Promise<MetricDefinitionRow> {
  const { data, error } = await supabase
    .from('lupg_metric_definitions')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as MetricDefinitionRow
}

export async function deleteMetric(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_metric_definitions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// === Sarpras item CRUD ===

export async function createSarprasItem(
  input: Tables['lupg_sarpras_items']['Insert']
): Promise<SarprasItemRow> {
  const { data, error } = await supabase
    .from('lupg_sarpras_items')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as SarprasItemRow
}

export async function updateSarprasItem(
  id: string,
  patch: Tables['lupg_sarpras_items']['Update']
): Promise<SarprasItemRow> {
  const { data, error } = await supabase
    .from('lupg_sarpras_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as SarprasItemRow
}

export async function deleteSarprasItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_sarpras_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}
