import { supabase } from '@/lib/supabase'
import { type MonthlyReportRow, type ProgramReportRow } from '../types'
import { ensureMonthlyReport } from '../services/monthly-report.service'

export interface YearlyProgramData {
  /** All monthly reports for this kelompok within the year (0..12 rows). */
  monthlyReports: MonthlyReportRow[]
  /** All program_reports joined to those monthly_reports. */
  programReports: ProgramReportRow[]
}

/**
 * Fetch all monthly reports for (kelompokId, year) and their program_reports in 2 queries.
 * Empty months are absent from the result — UI pivots + fills blanks.
 */
export async function listYearlyProgramData(
  kelompokId: string | undefined,
  year: number
): Promise<YearlyProgramData> {
  const from = `${year}-01-01`
  const to = `${year}-12-01`

  let q = supabase
    .from('lupg_monthly_reports')
    .select('*')
    .gte('month', from)
    .lte('month', to)
    .order('month')
  if (kelompokId) q = q.eq('kelompok_id', kelompokId)

  const { data: reports, error: e1 } = await q
  if (e1) throw e1
  const monthlyReports = (reports ?? []) as MonthlyReportRow[]

  if (monthlyReports.length === 0) {
    return { monthlyReports, programReports: [] }
  }

  const reportIds = monthlyReports.map((r) => r.id)
  const { data: progs, error: e2 } = await supabase
    .from('lupg_program_reports')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (e2) throw e2

  return {
    monthlyReports,
    programReports: (progs ?? []) as ProgramReportRow[],
  }
}

export interface UpsertProgramMonthInput {
  kelompok_id: string
  month: string // 'YYYY-MM'
  program_code: string
  denominator: number
  count_this_month: number
}

/**
 * Upsert a program report cell for a specific month.
 * Auto-ensures the target monthly_report exists for (kelompok_id, month) before upsert.
 * Ignores count_prev_month (monthly_series model doesn't use it).
 */
export async function upsertProgramMonth(
  input: UpsertProgramMonthInput
): Promise<ProgramReportRow> {
  const report = await ensureMonthlyReport(input.kelompok_id, input.month)

  const { data, error } = await supabase
    .from('lupg_program_reports')
    .upsert(
      {
        monthly_report_id: report.id,
        program_code: input.program_code,
        denominator: input.denominator,
        count_this_month: input.count_this_month,
        count_prev_month: null,
      },
      { onConflict: 'monthly_report_id,program_code' }
    )
    .select()
    .single()
  if (error) throw error
  return data as ProgramReportRow
}
