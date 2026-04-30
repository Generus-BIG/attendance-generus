import { type Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { type MustinTemplateRow } from '../types'

type Tables = Database['public']['Tables']

export async function listActiveMustinTemplates(): Promise<MustinTemplateRow[]> {
  const { data, error } = await supabase
    .from('lupg_mustin_templates')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as MustinTemplateRow[]
}

export async function listAllMustinTemplates(): Promise<MustinTemplateRow[]> {
  const { data, error } = await supabase
    .from('lupg_mustin_templates')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as MustinTemplateRow[]
}

export async function createMustinTemplate(
  input: Tables['lupg_mustin_templates']['Insert']
): Promise<MustinTemplateRow> {
  const { data, error } = await supabase
    .from('lupg_mustin_templates')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as MustinTemplateRow
}

export async function updateMustinTemplate(
  id: string,
  patch: Tables['lupg_mustin_templates']['Update']
): Promise<MustinTemplateRow> {
  const { data, error } = await supabase
    .from('lupg_mustin_templates')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as MustinTemplateRow
}

export async function deleteMustinTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('lupg_mustin_templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}
