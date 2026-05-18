import { supabase } from '@/lib/supabase'
import { type MetricReportRow, type MonthlyReportRow } from '../types'
import { getMonthlyReport } from './monthly-report.service'

export interface YearlyMetricData {
  /** All monthly reports for this kelompok within the year (0..12 rows). */
  monthlyReports: MonthlyReportRow[]
  /** All metric_reports joined to those monthly_reports. */
  metricReports: MetricReportRow[]
}

/**
 * Fetch all monthly reports for (kelompokId, year) and their metric_reports in 2 queries.
 * Empty months are absent from the result — UI pivots + fills blanks.
 */
export async function listYearlyMetrics(
  kelompokId: string | undefined,
  year: number
): Promise<YearlyMetricData> {
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

export async function listMetricReports(
  monthlyReportId: string
): Promise<MetricReportRow[]> {
  const { data, error } = await supabase
    .from('lupg_metric_reports')
    .select('*')
    .eq('monthly_report_id', monthlyReportId)
  if (error) throw error
  return (data ?? []) as MetricReportRow[]
}

export async function upsertMetricReport(input: {
  monthly_report_id: string
  metric_code: string
  denominator?: number | null
  current_value: number
  prev_value?: number | null
  notes?: string | null
}): Promise<MetricReportRow> {
  const { data, error } = await supabase
    .from('lupg_metric_reports')
    .upsert(
      {
        monthly_report_id: input.monthly_report_id,
        metric_code: input.metric_code,
        denominator: input.denominator ?? null,
        current_value: input.current_value,
        prev_value: input.prev_value ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: 'monthly_report_id,metric_code' }
    )
    .select()
    .single()
  if (error) throw error
  return data as MetricReportRow
}

export async function getPrevMonthMetricValues(
  kelompokId: string,
  currentMonth: string
): Promise<Record<string, number>> {
  const d = new Date(`${currentMonth}-01`)
  d.setMonth(d.getMonth() - 1)
  const prevMonth = `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`
  const prevReport = await getMonthlyReport(kelompokId, prevMonth)
  if (!prevReport) return {}

  const { data, error } = await supabase
    .from('lupg_metric_reports')
    .select('metric_code, current_value')
    .eq('monthly_report_id', prevReport.id)
  if (error) throw error
  const map: Record<string, number> = {}
  for (const row of (data ?? []) as Array<{
    metric_code: string
    current_value: number
  }>) {
    map[row.metric_code] = Number(row.current_value)
  }
  return map
}
