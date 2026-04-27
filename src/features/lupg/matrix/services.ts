import { supabase } from '@/lib/supabase'
import {
  type MetricReportRow,
  type MonthlyReportRow,
  type UpsertMetricMonthInput,
  type YearlyMatrixData,
} from '../types'
import { ensureMonthlyReport } from '../services/monthly-report.service'

/**
 * Fetch all monthly reports for (kelompokId, year) and their metric_reports in 2 queries.
 * Empty months are absent from the result — UI pivots + fills blanks.
 */
export async function listYearlyMatrixData(
  kelompokId: string,
  year: number
): Promise<YearlyMatrixData> {
  const from = `${year}-01-01`
  const to = `${year}-12-01`

  const { data: reports, error: e1 } = await supabase
    .from('lupg_monthly_reports')
    .select('*')
    .eq('kelompok_id', kelompokId)
    .gte('month', from)
    .lte('month', to)
    .order('month')
  if (e1) throw e1
  const monthlyReports = (reports ?? []) as MonthlyReportRow[]

  if (monthlyReports.length === 0) {
    return { monthlyReports, metricReports: [] }
  }

  const reportIds = monthlyReports.map((r) => r.id)
  const { data: metrics, error: e2 } = await supabase
    .from('lupg_metric_reports')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (e2) throw e2

  return {
    monthlyReports,
    metricReports: (metrics ?? []) as MetricReportRow[],
  }
}

/**
 * Upsert a metric report cell for a specific month.
 * Auto-ensures the target monthly_report exists for (kelompok_id, month).
 * prev_value / denominator / notes intentionally null — R1/R2 soft-deprecated.
 */
export async function upsertMetricMonth(
  input: UpsertMetricMonthInput
): Promise<MetricReportRow> {
  const report = await ensureMonthlyReport(input.kelompok_id, input.month)

  const { data, error } = await supabase
    .from('lupg_metric_reports')
    .upsert(
      {
        monthly_report_id: report.id,
        metric_code: input.metric_code,
        current_value: input.current_value,
        prev_value: null,
        denominator: null,
        notes: null,
      },
      { onConflict: 'monthly_report_id,metric_code' }
    )
    .select()
    .single()
  if (error) throw error
  return data as MetricReportRow
}
