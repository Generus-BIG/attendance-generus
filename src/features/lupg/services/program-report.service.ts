import { supabase } from '@/lib/supabase'
import { type ProgramReportRow } from '../types'
import { getMonthlyReport } from './monthly-report.service'

export async function listProgramReports(
  monthlyReportId: string
): Promise<ProgramReportRow[]> {
  const { data, error } = await supabase
    .from('lupg_program_reports')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
  if (error) throw error
  return (data ?? []) as ProgramReportRow[]
}

export async function upsertProgramReport(input: {
  monthly_report_id: string
  program_code: string
  denominator: number
  count_this_month: number
  count_prev_month?: number | null
  notes?: string | null
}): Promise<ProgramReportRow> {
  const { data, error } = await supabase
    .from('lupg_program_reports')
    .upsert(
      {
        monthly_report_id: input.monthly_report_id,
        program_code: input.program_code,
        denominator: input.denominator,
        count_this_month: input.count_this_month,
        count_prev_month: input.count_prev_month ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: 'monthly_report_id,program_code' }
    )
    .select()
    .single()
  if (error) throw error
  return data as ProgramReportRow
}

export async function getPrevMonthProgramValues(
  kelompokId: string,
  currentMonth: string
): Promise<Record<string, { count: number; denominator: number }>> {
  const d = new Date(`${currentMonth}-01`)
  d.setMonth(d.getMonth() - 1)
  const prevMonth = `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`
  const prevReport = await getMonthlyReport(kelompokId, prevMonth)
  if (!prevReport) return {}

  const { data, error } = await supabase
    .from('lupg_program_reports')
    .select('program_code, count_this_month, denominator')
    .eq('monthly_report_id', prevReport.id)
  if (error) throw error
  const map: Record<string, { count: number; denominator: number }> = {}
  for (const row of (data ?? []) as Array<{
    program_code: string
    count_this_month: number
    denominator: number
  }>) {
    map[row.program_code] = {
      count: row.count_this_month,
      denominator: row.denominator,
    }
  }
  return map
}
