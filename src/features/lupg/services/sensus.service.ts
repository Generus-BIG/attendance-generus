import { supabase } from '@/lib/supabase'
import { type CategoryCode } from '../constants'
import {
  type SensusRow,
  type SensusSnapshotRow,
  type SensusGender,
} from '../types'

export async function listSensus(kelompokId: string): Promise<SensusRow[]> {
  const { data, error } = await supabase
    .from('lupg_sensus')
    .select('*')
    .eq('kelompok_id', kelompokId)
    .order('category_code')
    .order('gender')
  if (error) throw error
  return (data ?? []) as SensusRow[]
}

export async function upsertSensusCell(input: {
  kelompok_id: string
  category_code: CategoryCode
  gender: SensusGender
  count: number
}): Promise<SensusRow> {
  const { data, error } = await supabase
    .from('lupg_sensus')
    .upsert(
      {
        kelompok_id: input.kelompok_id,
        category_code: input.category_code,
        gender: input.gender,
        count: input.count,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'kelompok_id,category_code,gender' }
    )
    .select()
    .single()
  if (error) throw error
  return data as SensusRow
}

export async function listSensusSnapshots(
  monthlyReportId: string
): Promise<SensusSnapshotRow[]> {
  const { data, error } = await supabase
    .from('lupg_sensus_snapshots')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
    .order('category_code')
    .order('gender')
  if (error) throw error
  return (data ?? []) as SensusSnapshotRow[]
}
