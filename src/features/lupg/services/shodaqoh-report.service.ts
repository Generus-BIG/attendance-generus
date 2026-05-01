import { supabase } from '@/lib/supabase'
import { type ShodaqohRow } from '../types'
import { getMonthlyReport } from './monthly-report.service'

export async function getShodaqoh(
  monthlyReportId: string
): Promise<ShodaqohRow | null> {
  const { data, error } = await supabase
    .from('lupg_shodaqoh')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
    .maybeSingle()
  if (error) throw error
  return (data as ShodaqohRow | null) ?? null
}

export async function upsertShodaqoh(input: {
  monthly_report_id: string
  nominal: number
  jumlah_kk: number
  notes?: string | null
}): Promise<ShodaqohRow> {
  const { data, error } = await supabase
    .from('lupg_shodaqoh')
    .upsert(
      {
        monthly_report_id: input.monthly_report_id,
        nominal: input.nominal,
        jumlah_kk: input.jumlah_kk,
        notes: input.notes ?? null,
      },
      { onConflict: 'monthly_report_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as ShodaqohRow
}

export async function getPrevMonthShodaqoh(
  kelompokId: string,
  currentMonth: string
): Promise<{ jumlah_kk: number; nominal: number } | null> {
  const d = new Date(`${currentMonth}-01`)
  d.setMonth(d.getMonth() - 1)
  const prevMonth = `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`
  const prevReport = await getMonthlyReport(kelompokId, prevMonth)
  if (!prevReport) return null
  const s = await getShodaqoh(prevReport.id)
  if (!s) return null
  return { jumlah_kk: s.jumlah_kk, nominal: Number(s.nominal) }
}
