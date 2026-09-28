import { supabase } from '@/lib/supabase'

export interface SensusSyncRun {
  id: string
  mode: 'manual' | 'cron'
  row_count: number
  status: 'staged' | 'failed'
  error: string | null
  created_at: string
}

export interface SensusSyncCandidate {
  id: string
  name: string
  kelompok: string
  gender: string
  birth_date: string | null
  category: string | null
  is_khusus: boolean
}

export interface SensusSyncItem {
  id: string
  run_id: string
  source_name: string
  source_kelompok: string
  source_gender: 'L' | 'P'
  source_birth_date: string | null
  source_kategori: string
  source_khusus: boolean
  matched_participant_id: string | null
  confidence: 'exact' | 'similar' | 'none'
  patch: {
    birth_date: string | null
    kategori: string
    khusus: boolean
    current?: {
      id: string
      name: string
      birth_date: string | null
      kategori: string | null
      khusus: boolean
    } | null
    candidates?: SensusSyncCandidate[]
  }
  status: 'pending' | 'applied' | 'rejected'
  error: string | null
}

export async function stageSensusSync(): Promise<{
  run_id: string
  staged: number
}> {
  const { data, error } = await supabase.functions.invoke('sensus-sync', {
    body: { action: 'stage' },
  })
  if (error) throw error
  return data as { run_id: string; staged: number }
}

export async function applySensusSyncItems(
  itemIds: string[]
): Promise<{ applied: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke('sensus-sync', {
    body: { action: 'apply', item_ids: itemIds },
  })
  if (error) throw error
  return (data as { result: { applied: number; failed: number } }).result
}

export async function listSensusRuns(): Promise<SensusSyncRun[]> {
  const { data, error } = await supabase
    .from('sensus_sync_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data as unknown as SensusSyncRun[]
}

export async function listSensusItems(
  runId: string
): Promise<SensusSyncItem[]> {
  const { data, error } = await supabase
    .from('sensus_sync_items')
    .select('*')
    .eq('run_id', runId)
    .order('source_name')
  if (error) throw error
  return data as unknown as SensusSyncItem[]
}
