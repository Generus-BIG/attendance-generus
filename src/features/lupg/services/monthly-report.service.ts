import { supabase } from '@/lib/supabase'
import { type MonthlyReportRow, type MonthlyReportInsert } from '../types'

function firstDayOfMonth(month: string | Date): string {
  const d = typeof month === 'string' ? new Date(`${month}-01`) : month
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${y}-${m}-01`
}

export async function listMonthlyReports(params: {
  kelompokId?: string
  fromMonth?: string
  toMonth?: string
}): Promise<MonthlyReportRow[]> {
  let q = supabase
    .from('lupg_monthly_reports')
    .select('*')
    .order('month', { ascending: false })

  if (params.kelompokId) q = q.eq('kelompok_id', params.kelompokId)
  if (params.fromMonth) q = q.gte('month', firstDayOfMonth(params.fromMonth))
  if (params.toMonth) q = q.lte('month', firstDayOfMonth(params.toMonth))

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as MonthlyReportRow[]
}

export async function getMonthlyReport(
  kelompokId: string,
  month: string
): Promise<MonthlyReportRow | null> {
  const { data, error } = await supabase
    .from('lupg_monthly_reports')
    .select('*')
    .eq('kelompok_id', kelompokId)
    .eq('month', firstDayOfMonth(month))
    .maybeSingle()
  if (error) throw error
  return (data as MonthlyReportRow | null) ?? null
}

export async function getMonthlyReportById(
  id: string
): Promise<MonthlyReportRow | null> {
  const { data, error } = await supabase
    .from('lupg_monthly_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as MonthlyReportRow | null) ?? null
}

export async function createMonthlyReport(
  input: Pick<MonthlyReportInsert, 'kelompok_id' | 'month'>
): Promise<MonthlyReportRow> {
  const { data, error } = await supabase
    .from('lupg_monthly_reports')
    .insert({
      kelompok_id: input.kelompok_id,
      month: firstDayOfMonth(input.month as string),
      status: 'draft',
    })
    .select()
    .single()
  if (error) throw error
  return data as MonthlyReportRow
}

export async function ensureMonthlyReport(
  kelompokId: string,
  month: string
): Promise<MonthlyReportRow> {
  const existing = await getMonthlyReport(kelompokId, month)
  if (existing) return existing
  return createMonthlyReport({ kelompok_id: kelompokId, month })
}

export async function submitMonthlyReport(
  id: string
): Promise<MonthlyReportRow> {
  const { data, error } = await supabase
    .from('lupg_monthly_reports')
    .update({ status: 'submitted' })
    .eq('id', id)
    .eq('status', 'draft')
    .select()
    .single()
  if (error) throw error
  return data as MonthlyReportRow
}

export async function unlockMonthlyReport(
  id: string
): Promise<MonthlyReportRow> {
  const { data, error } = await supabase
    .from('lupg_monthly_reports')
    .update({ status: 'draft', locked: false })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as MonthlyReportRow
}
