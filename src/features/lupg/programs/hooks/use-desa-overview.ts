import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getSignedUrls } from '../../services/activity-photos.service'
import {
  type MetricReportRow,
  type MonthlyReportRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
  type SarprasReportRow,
  type ShodaqohRow,
} from '../../types'
import { shiftMonth } from '../../utils/month-utils'
import {
  aggregateAttendanceCategories,
  type AttendanceAggregate,
  type AttendanceValue,
} from '../utils/attendance-aggregate'

export interface KelompokLite {
  id: string
  name: string
}

export interface DesaSummary {
  desaAvg: number | null
  sensusActive: number
  kehadiranAvg: number | null
  programOkCount: number
  sarprasOkCount: number
  shodaqohMtd: number | null
  deltaDesaAvg: number | null
  deltaSensus: number | null
  deltaKehadiran: number | null
  deltaShodaqoh: number | null
}

export interface TrendPoint {
  monthKey: string
  value: number | null
}

export interface SensusCategorySlice {
  category: string
  count: number
  pct: number
}

export interface ProgramRankedRow {
  code: string
  name: string
  pct: number | null
}

export interface ProgramKelompokMatrixRow {
  code: string
  name: string
  byKelompok: Record<string, number | null>
}

export interface SarprasCompletenessRow {
  kelompokId: string
  kelompokName: string
  items: boolean[]
  okCount: number
  total: number
}

export interface ShodaqohPerKelompokRow {
  kelompokId: string
  kelompokName: string
  nominal: number | null
}

export interface ProgramTrendLine {
  code: string
  name: string
  monthly: Array<number | null>
}

export interface MustinRecapRow {
  id: string
  kelompokName: string
  pokokMasalah: string
  keputusanRencana: string
  status?: string
  sortOrder: number
}

export interface DocumentationPreview {
  id: string
  kelompokName: string
  caption: string | null
  signedUrl: string | null
}

export interface DesaOverviewData {
  year: number
  monthKey: string
  kelompoks: KelompokLite[]
  summary: DesaSummary
  trendRataDesa: TrendPoint[]
  sensusByCategory: SensusCategorySlice[]
  attendance: AttendanceAggregate
  mustinNotes: MustinRecapRow[]
  documentation: DocumentationPreview[]
  programRanked: ProgramRankedRow[]
  programKelompokMatrix: ProgramKelompokMatrixRow[]
  sarprasCompleteness: SarprasCompletenessRow[]
  shodaqohPerKelompok: ShodaqohPerKelompokRow[]
  programTrendLines: ProgramTrendLine[]
}

async function fetchDesaOverview(
  year: number,
  monthKey: string
): Promise<DesaOverviewData> {
  const prevMonthKey = shiftMonth(monthKey, -1)
  const fromMonth = `${year}-01-01`
  const toMonth = `${year}-12-31`

  // First batch: independent lookups (no reportIds dependency yet).
  const [
    { data: kelompokRows, error: kelompokError },
    { data: programRows, error: programError },
    { data: sarprasItemRows, error: sarprasItemError },
    { data: monthlyReportRows, error: monthlyError },
    { data: sensusMasterRows, error: sensusMasterError },
    { data: previousYearMonthRows, error: previousYearMonthError },
  ] = await Promise.all([
    supabase
      .from('lookup_values')
      .select('id, value')
      .eq('type', 'GROUP')
      .order('value'),
    supabase
      .from('lupg_program_definitions')
      .select('*')
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('lupg_sarpras_items')
      .select('id, name, sort_order')
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('lupg_monthly_reports')
      .select('*')
      .gte('month', fromMonth)
      .lte('month', toMonth),
    // Live sensus master — no month binding. Used for Sensus Aktif KPI + donut
    // so the dashboard reflects current roster even when monthly reports are still in draft
    // (snapshots are only frozen on submit).
    supabase.from('lupg_sensus').select('*'),
    prevMonthKey.startsWith(`${year}-`)
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('lupg_monthly_reports')
          .select('id, kelompok_id, month')
          .eq('month', `${prevMonthKey}-01`),
  ])

  if (kelompokError) throw kelompokError
  if (programError) throw programError
  if (sarprasItemError) throw sarprasItemError
  if (monthlyError) throw monthlyError
  if (sensusMasterError) throw sensusMasterError
  if (previousYearMonthError) throw previousYearMonthError

  const kelompoks: KelompokLite[] = (kelompokRows ?? []).map(
    (k: { id: string; value: string }) => ({ id: k.id, name: k.value })
  )
  const programs = (programRows ?? []) as ProgramDefinitionRow[]
  const sarprasItems = (sarprasItemRows ?? []) as Array<{
    id: string
    name: string
    sort_order: number
  }>
  const monthlyReports = (monthlyReportRows ?? []) as MonthlyReportRow[]

  const reportIds = monthlyReports.map((r) => r.id)
  const selectedReports = monthlyReports.filter(
    (report) => report.month.slice(0, 7) === monthKey
  )
  const selectedReportIds = selectedReports.map((report) => report.id)
  const priorYearReports = (previousYearMonthRows ?? []) as Array<{
    id: string
    kelompok_id: string
    month: string
  }>

  // Second batch: child rows scoped to the monthly_reports we just fetched.
  const emptyResult = { data: [], error: null }
  const [
    { data: programReportRows, error: progRepError },
    { data: metricReportRows, error: metricRepError },
    { data: sarprasReportRows, error: sarprasRepError },
    { data: shodaqohRows, error: shodaqohError },
    { data: mustinRows, error: mustinError },
    { data: photoRows, error: photoError },
    { data: priorYearMetricRows, error: priorYearMetricError },
  ] = await Promise.all([
    reportIds.length > 0
      ? supabase
          .from('lupg_program_reports')
          .select('*')
          .in('monthly_report_id', reportIds)
      : Promise.resolve(emptyResult),
    reportIds.length > 0
      ? supabase
          .from('lupg_metric_reports')
          .select('*')
          .in('monthly_report_id', reportIds)
      : Promise.resolve(emptyResult),
    reportIds.length > 0
      ? supabase
          .from('lupg_sarpras_reports')
          .select('*')
          .in('monthly_report_id', reportIds)
      : Promise.resolve(emptyResult),
    reportIds.length > 0
      ? supabase
          .from('lupg_shodaqoh')
          .select('*')
          .in('monthly_report_id', reportIds)
      : Promise.resolve(emptyResult),
    selectedReportIds.length > 0
      ? supabase
          .from('lupg_mustin_notes')
          .select(
            'id, monthly_report_id, pokok_masalah, keputusan_rencana, status, sort_order'
          )
          .in('monthly_report_id', selectedReportIds)
          .order('sort_order')
      : Promise.resolve(emptyResult),
    selectedReportIds.length > 0
      ? supabase
          .from('lupg_activity_photos')
          .select('id, report_id, caption, storage_path, sort_order')
          .in('report_id', selectedReportIds)
          .order('report_id')
          .order('sort_order')
      : Promise.resolve(emptyResult),
    priorYearReports.length > 0
      ? supabase
          .from('lupg_metric_reports')
          .select('monthly_report_id, metric_code, current_value')
          .in(
            'monthly_report_id',
            priorYearReports.map((report) => report.id)
          )
      : Promise.resolve(emptyResult),
  ])

  if (progRepError) throw progRepError
  if (metricRepError) throw metricRepError
  if (sarprasRepError) throw sarprasRepError
  if (shodaqohError) throw shodaqohError
  if (mustinError) throw mustinError
  if (photoError) throw photoError
  if (priorYearMetricError) throw priorYearMetricError

  const programReports = (programReportRows ?? []) as ProgramReportRow[]
  const metricReports = (metricReportRows ?? []) as MetricReportRow[]
  const sarprasReports = (sarprasReportRows ?? []) as SarprasReportRow[]
  const shodaqohList = (shodaqohRows ?? []) as ShodaqohRow[]
  // Live sensus rows scoped to current active kelompoks.
  const sensusMaster = (sensusMasterRows ?? []) as Array<{
    kelompok_id: string
    category_code: string
    gender: string
    count: number
  }>
  const activeKelompokIds = new Set(kelompoks.map((k) => k.id))
  const kelompokNameById = new Map(kelompoks.map((k) => [k.id, k.name]))
  const selectedReportById = new Map(
    selectedReports.map((report) => [report.id, report])
  )
  const mustinNotes: MustinRecapRow[] = (mustinRows ?? []).flatMap((note) => {
    const report = selectedReportById.get(note.monthly_report_id)
    if (!report) return []
    return [
      {
        id: note.id,
        kelompokName: kelompokNameById.get(report.kelompok_id) ?? 'Kelompok',
        pokokMasalah: note.pokok_masalah,
        keputusanRencana: note.keputusan_rencana,
        status: note.status,
        sortOrder: note.sort_order,
      },
    ]
  })
  const photos = photoRows ?? []
  const signedUrls = await getSignedUrls(
    photos.map((photo) => photo.storage_path)
  ).catch(() => new Map<string, string>())
  const documentation: DocumentationPreview[] = photos.flatMap((photo) => {
    const report = selectedReportById.get(photo.report_id)
    if (!report) return []
    return [
      {
        id: photo.id,
        kelompokName: kelompokNameById.get(report.kelompok_id) ?? 'Kelompok',
        caption: photo.caption,
        signedUrl: signedUrls.get(photo.storage_path) ?? null,
      },
    ]
  })

  // Index monthly_reports by (kelompok, month).
  const reportByKelompokMonth = new Map<string, MonthlyReportRow>()
  for (const r of monthlyReports) {
    reportByKelompokMonth.set(`${r.kelompok_id}__${r.month.slice(0, 7)}`, r)
  }
  const reportById = new Map(
    monthlyReports.map((report) => [report.id, report])
  )

  const attendanceRows: AttendanceValue[] = metricReports.flatMap((metric) => {
    const report = reportById.get(metric.monthly_report_id)
    if (!report || !activeKelompokIds.has(report.kelompok_id)) return []
    return [
      {
        monthKey: report.month.slice(0, 7),
        kelompokId: report.kelompok_id,
        code: metric.metric_code,
        value:
          metric.current_value == null ? null : Number(metric.current_value),
      },
    ]
  })
  const priorReportById = new Map(
    priorYearReports.map((report) => [report.id, report])
  )
  for (const metric of priorYearMetricRows ?? []) {
    const report = priorReportById.get(metric.monthly_report_id)
    if (!report || !activeKelompokIds.has(report.kelompok_id)) continue
    attendanceRows.push({
      monthKey: prevMonthKey,
      kelompokId: report.kelompok_id,
      code: metric.metric_code,
      value: metric.current_value == null ? null : Number(metric.current_value),
    })
  }
  const attendance = aggregateAttendanceCategories(
    attendanceRows,
    monthKey,
    prevMonthKey
  )

  // ---- Per-month program aggregates (for trend + ranked + matrix + weighted desa avg) ----
  const monthKeysYear: string[] = []
  for (let m = 1; m <= 12; m++) {
    monthKeysYear.push(`${year}-${String(m).padStart(2, '0')}`)
  }

  // program_code -> monthKey -> { totalCount, totalDenom }
  const progMonthTotals = new Map<
    string,
    Map<string, { count: number; denom: number }>
  >()
  for (const p of programs) {
    progMonthTotals.set(p.code, new Map())
  }
  for (const pr of programReports) {
    const parent = reportById.get(pr.monthly_report_id)
    if (!parent) continue
    const mk = parent.month.slice(0, 7)
    const bucket = progMonthTotals.get(pr.program_code)
    if (!bucket) continue
    const cur = bucket.get(mk) ?? { count: 0, denom: 0 }
    cur.count += pr.count_this_month ?? 0
    cur.denom += pr.denominator ?? 0
    bucket.set(mk, cur)
  }

  function weightedPct(count: number, denom: number): number | null {
    if (denom <= 0) return null
    return Math.round((count / denom) * 100)
  }

  // --- programTrendLines (6 × 12) ---
  const programTrendLines: ProgramTrendLine[] = programs.map((p) => {
    const bucket = progMonthTotals.get(p.code) ?? new Map()
    return {
      code: p.code,
      name: p.name,
      monthly: monthKeysYear.map((mk) => {
        const agg = bucket.get(mk)
        return agg ? weightedPct(agg.count, agg.denom) : null
      }),
    }
  })

  // --- trendRataDesa (avg across programs per month) ---
  const trendRataDesa: TrendPoint[] = monthKeysYear.map((mk) => {
    const pctsThisMonth: number[] = []
    for (const p of programs) {
      const agg = progMonthTotals.get(p.code)?.get(mk)
      if (!agg) continue
      const pct = weightedPct(agg.count, agg.denom)
      if (pct != null) pctsThisMonth.push(pct)
    }
    return {
      monthKey: mk,
      value:
        pctsThisMonth.length > 0
          ? Math.round(
              pctsThisMonth.reduce((a, b) => a + b, 0) / pctsThisMonth.length
            )
          : null,
    }
  })

  // --- programRanked (current month) ---
  const programRanked: ProgramRankedRow[] = programs
    .map((p) => {
      const agg = progMonthTotals.get(p.code)?.get(monthKey)
      return {
        code: p.code,
        name: p.name,
        pct: agg ? weightedPct(agg.count, agg.denom) : null,
      }
    })
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

  // --- programKelompokMatrix (current month) ---
  const programKelompokMatrix: ProgramKelompokMatrixRow[] = programs.map(
    (p) => {
      const byKelompok: Record<string, number | null> = {}
      for (const k of kelompoks) {
        const report = reportByKelompokMonth.get(`${k.id}__${monthKey}`)
        const pr = report
          ? programReports.find(
              (r) =>
                r.monthly_report_id === report.id && r.program_code === p.code
            )
          : undefined
        byKelompok[k.id] =
          pr && pr.denominator && pr.denominator > 0
            ? Math.round(((pr.count_this_month ?? 0) / pr.denominator) * 100)
            : null
      }
      return { code: p.code, name: p.name, byKelompok }
    }
  )

  // --- sensusByCategory (live master — always current state; unaffected by draft/submit).
  // Spec: "Sum of lupg_sensus.count for all kelompoks in the selected month".
  // The master table has no month binding, so this reflects the live roster across all active kelompoks.
  const sensusByCategoryMap = new Map<string, number>()
  let sensusActive = 0
  for (const s of sensusMaster) {
    if (!activeKelompokIds.has(s.kelompok_id)) continue
    const prev = sensusByCategoryMap.get(s.category_code) ?? 0
    sensusByCategoryMap.set(s.category_code, prev + (s.count ?? 0))
    sensusActive += s.count ?? 0
  }
  const sensusByCategoryEntries = Array.from(sensusByCategoryMap.entries())
  const sensusTotal = sensusByCategoryEntries.reduce((a, b) => a + b[1], 0)
  const sensusByCategory: SensusCategorySlice[] = sensusByCategoryEntries
    .map(([category, count]) => ({
      category,
      count,
      pct: sensusTotal > 0 ? Math.round((count / sensusTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const kehadiranAvgThis = attendance.generus.average

  // --- sarprasCompleteness (current month) + sarprasOkCount ---
  const sarprasCompleteness: SarprasCompletenessRow[] = kelompoks.map((k) => {
    const report = reportByKelompokMonth.get(`${k.id}__${monthKey}`)
    const items: boolean[] = sarprasItems.map((it) => {
      if (!report) return false
      const row = sarprasReports.find(
        (sr) => sr.monthly_report_id === report.id && sr.item_id === it.id
      )
      return !!row?.is_fulfilled
    })
    const okCount = items.filter(Boolean).length
    return {
      kelompokId: k.id,
      kelompokName: k.name,
      items,
      okCount,
      total: sarprasItems.length,
    }
  })

  // Desa sarprasOkCount = items fulfilled by ALL kelompoks.
  const sarprasOkCount = sarprasItems.reduce((acc, _item, idx) => {
    const allOk = sarprasCompleteness.every((row) => row.items[idx] === true)
    return acc + (allOk ? 1 : 0)
  }, 0)

  // --- shodaqohPerKelompok (current month) + MTD total + prev month MTD for delta ---
  const shodaqohPerKelompok: ShodaqohPerKelompokRow[] = kelompoks.map((k) => {
    const report = reportByKelompokMonth.get(`${k.id}__${monthKey}`)
    const row = report
      ? shodaqohList.find((s) => s.monthly_report_id === report.id)
      : undefined
    return {
      kelompokId: k.id,
      kelompokName: k.name,
      nominal: row?.nominal == null ? null : Number(row.nominal),
    }
  })
  const currentShodaqohValues = shodaqohPerKelompok.flatMap((row) =>
    row.nominal == null ? [] : [row.nominal]
  )
  const shodaqohMtd = currentShodaqohValues.length
    ? currentShodaqohValues.reduce((a, b) => a + b, 0)
    : null

  const shodaqohPrevValues = kelompoks.flatMap((k) => {
    const prevReport = reportByKelompokMonth.get(`${k.id}__${prevMonthKey}`)
    const row = prevReport
      ? shodaqohList.find((s) => s.monthly_report_id === prevReport.id)
      : undefined
    return row?.nominal == null ? [] : [Number(row.nominal)]
  })
  const shodaqohPrevMtd = shodaqohPrevValues.length
    ? shodaqohPrevValues.reduce((a, b) => a + b, 0)
    : null
  const deltaShodaqoh =
    shodaqohMtd != null && shodaqohPrevMtd != null && shodaqohPrevMtd > 0
      ? Math.round(((shodaqohMtd - shodaqohPrevMtd) / shodaqohPrevMtd) * 100)
      : null

  // --- desaAvg (weighted over programs in current month) ---
  const desaAvgThisMonth = (() => {
    const pctsForAvg: number[] = []
    for (const p of programs) {
      const agg = progMonthTotals.get(p.code)?.get(monthKey)
      if (!agg) continue
      const pct = weightedPct(agg.count, agg.denom)
      if (pct != null) pctsForAvg.push(pct)
    }
    return pctsForAvg.length > 0
      ? Math.round(pctsForAvg.reduce((a, b) => a + b, 0) / pctsForAvg.length)
      : null
  })()
  const desaAvgPrevMonth = (() => {
    const pctsForAvg: number[] = []
    for (const p of programs) {
      const agg = progMonthTotals.get(p.code)?.get(prevMonthKey)
      if (!agg) continue
      const pct = weightedPct(agg.count, agg.denom)
      if (pct != null) pctsForAvg.push(pct)
    }
    return pctsForAvg.length > 0
      ? Math.round(pctsForAvg.reduce((a, b) => a + b, 0) / pctsForAvg.length)
      : null
  })()

  const deltaDesaAvg =
    desaAvgThisMonth != null && desaAvgPrevMonth != null
      ? desaAvgThisMonth - desaAvgPrevMonth
      : null

  // --- deltaSensus ---
  // Master sensus has no month binding (always current state), so MoM delta isn't
  // available. Historical comparison would require reading snapshots, which are only
  // populated for submitted months — unreliable. Show "—" in the chip.
  const deltaSensus: number | null = null

  // --- deltaKehadiran (avg across metrics, MoM) ---
  const kehadiranAvgPrev = attendance.generus.previousAverage
  const deltaKehadiran =
    kehadiranAvgThis != null && kehadiranAvgPrev != null
      ? kehadiranAvgThis - kehadiranAvgPrev
      : null

  // --- programOkCount (weighted avg ≥ 80% current month) ---
  const programOkCount = programs.reduce((acc, p) => {
    const agg = progMonthTotals.get(p.code)?.get(monthKey)
    const pct = agg ? weightedPct(agg.count, agg.denom) : null
    return acc + (pct != null && pct >= 80 ? 1 : 0)
  }, 0)

  return {
    year,
    monthKey,
    kelompoks,
    summary: {
      desaAvg: desaAvgThisMonth,
      sensusActive,
      kehadiranAvg: kehadiranAvgThis,
      programOkCount,
      sarprasOkCount,
      shodaqohMtd,
      deltaDesaAvg,
      deltaSensus,
      deltaKehadiran,
      deltaShodaqoh,
    },
    trendRataDesa,
    sensusByCategory,
    attendance,
    mustinNotes,
    documentation,
    programRanked,
    programKelompokMatrix,
    sarprasCompleteness,
    shodaqohPerKelompok,
    programTrendLines,
  }
}

export function useDesaOverview(year: number, monthKey: string) {
  return useQuery({
    queryKey: ['lupg', 'desa-overview', year, monthKey] as const,
    queryFn: () => fetchDesaOverview(year, monthKey),
    staleTime: 10_000,
  })
}
