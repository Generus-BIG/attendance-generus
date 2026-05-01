import { supabase } from '@/lib/supabase'
import { type MetricReportRow } from '../types'
import { getMonthlyReport } from './monthly-report.service'

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
