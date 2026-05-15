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

export interface YearlyShodaqohData {
  /** All monthly reports for this kelompok within the year (0..12 rows). */
  monthlyReports: { id: string; month: string }[]
  /** All shodaqoh rows joined to those monthly reports. */
  shodaqohRows: ShodaqohRow[]
}

/**
 * Fetch all monthly reports + their shodaqoh rows for (kelompokId, year) in 2 queries.
 * Empty months are absent from the result — the UI pivots + fills blanks.
 */
export async function listYearlyShodaqohData(
  kelompokId: string,
  year: number
): Promise<YearlyShodaqohData> {
  const from = `${year}-01-01`
  const to = `${year}-12-01`

  const { data: reports, error: e1 } = await supabase
    .from('lupg_monthly_reports')
    .select('id, month')
    .eq('kelompok_id', kelompokId)
    .gte('month', from)
    .lte('month', to)
    .order('month')
  if (e1) throw e1
  const monthlyReports = (reports ?? []) as { id: string; month: string }[]

  if (monthlyReports.length === 0) {
    return { monthlyReports, shodaqohRows: [] }
  }

  const reportIds = monthlyReports.map((r) => r.id)
  const { data: shodaqoh, error: e2 } = await supabase
    .from('lupg_shodaqoh')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (e2) throw e2

  return {
    monthlyReports,
    shodaqohRows: (shodaqoh ?? []) as ShodaqohRow[],
  }
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
