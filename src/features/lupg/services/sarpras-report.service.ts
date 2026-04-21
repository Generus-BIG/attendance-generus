import { supabase } from '@/lib/supabase'
import { type SarprasReportRow } from '../types'

export async function listSarprasReports(
  monthlyReportId: string
): Promise<SarprasReportRow[]> {
  const { data, error } = await supabase
    .from('lupg_sarpras_reports')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
  if (error) throw error
  return (data ?? []) as SarprasReportRow[]
}

export async function upsertSarprasReport(input: {
  monthly_report_id: string
  item_id: string
  is_fulfilled: boolean
  notes?: string | null
}): Promise<SarprasReportRow> {
  const { data, error } = await supabase
    .from('lupg_sarpras_reports')
    .upsert(
      {
        monthly_report_id: input.monthly_report_id,
        item_id: input.item_id,
        is_fulfilled: input.is_fulfilled,
        notes: input.notes ?? null,
      },
      { onConflict: 'monthly_report_id,item_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as SarprasReportRow
}
