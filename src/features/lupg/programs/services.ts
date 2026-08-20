import { supabase } from '@/lib/supabase'
import { ensureMonthlyReport } from '../services/monthly-report.service'
import { type MonthlyReportRow, type ProgramReportRow } from '../types'

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
  /** Optional free-text "Hasil Temuan" / "Keterangan". Persisted to lupg_program_reports.notes. */
  notes?: string | null
  /** Optional program-specific extras jsonb. NIKAH_JM uses {not_ready, ready, married}. */
  extras?: Record<string, number>
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

  // Only include notes / extras in the payload when the caller provided them,
  // so we don't overwrite existing values with undefined.
  const payload: Record<string, unknown> = {
    monthly_report_id: report.id,
    program_code: input.program_code,
    denominator: input.denominator,
    count_this_month: input.count_this_month,
    count_prev_month: null,
  }
  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() ? input.notes.trim() : null
  }
  if (input.extras !== undefined) {
    payload.extras = input.extras
  }

  const { data, error } = await supabase
    .from('lupg_program_reports')
    .upsert(payload, { onConflict: 'monthly_report_id,program_code' })
    .select()
    .single()
  if (error) throw error
  return data as ProgramReportRow
}
