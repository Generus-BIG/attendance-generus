import { supabase } from '@/lib/supabase'
import { listYearlyProgramData } from '../../programs/services'
import {
  listActiveCharacterMonitoringActivities,
  listCharacterMonitoringReportsBatch,
} from '../../services/character-monitoring.service'
import {
  listActiveCharacterTargetItemsForMonth,
  listCharacterTargetReportsBatch,
} from '../../services/character-targets.service'
import {
  listActiveMetrics,
  listActiveSarprasItems,
  listAllPrograms,
} from '../../services/definitions.service'
import { listYearlyMetrics } from '../../services/metric-report.service'
import { listMonthlyReports } from '../../services/monthly-report.service'
import { listActiveMustinTemplates } from '../../services/mustin-templates.service'
import { listYearlyShodaqohData } from '../../services/shodaqoh-report.service'
import { type SensusCellRow, type SensusRow } from '../../types'
import { firstDayOfMonth } from '../../utils/month-utils'
import { type Kelompok, type PresentationData } from './slides'

interface PrivatePresentationRequest {
  monthKey: string
  kelompokId?: string
}

async function readRows<T>(
  query: PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as T[]
}

export async function loadPrivatePresentationData({
  monthKey,
  kelompokId,
}: PrivatePresentationRequest): Promise<PresentationData> {
  const year = parseInt(monthKey.slice(0, 4), 10)
  const monthIndex = parseInt(monthKey.slice(5, 7), 10)
  const [
    kelompokList,
    reportsRaw,
    programs,
    metrics,
    sarprasItems,
    mustinTemplates,
    characterTargetData,
    characterActivities,
    yearlyPrograms,
    yearlyMetrics,
    yearlyShodaqoh,
  ] = await Promise.all([
    readRows<Kelompok>(
      supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
    ),
    listMonthlyReports({ kelompokId, fromMonth: monthKey, toMonth: monthKey }),
    // PHQ and SHOLAT_ACR remain in the deck even when inactive.
    listAllPrograms(),
    listActiveMetrics(),
    listActiveSarprasItems(),
    listActiveMustinTemplates(),
    listActiveCharacterTargetItemsForMonth(year, monthIndex),
    listActiveCharacterMonitoringActivities(),
    listYearlyProgramData(kelompokId, year),
    listYearlyMetrics(kelompokId, year),
    kelompokId
      ? listYearlyShodaqohData(kelompokId, year)
      : Promise.resolve({ shodaqohRows: [] }),
  ])
  const reports = reportsRaw.filter(
    (r) => r.month === firstDayOfMonth(monthKey)
  )
  const reportIds = reports.map((r) => r.id)
  const kelompokIds = kelompokId ? [kelompokId] : kelompokList.map((k) => k.id)

  function reportRows<T>(table: string, ordered = false) {
    if (!reportIds.length) return Promise.resolve([] as T[])
    let query = supabase
      .from(table)
      .select('*')
      .in('monthly_report_id', reportIds)
    if (ordered) query = query.order('sort_order')
    return readRows<T>(query)
  }

  const [
    presentationReports,
    programReports,
    metricReports,
    sarprasReports,
    shodaqohRows,
    mustinRows,
    characterTargetReports,
    characterReports,
    masterSensus,
    derivedSensus,
    activityPhotos,
  ] = await Promise.all([
    Promise.all(
      reports.map(async (report) => {
        const [editor, submitter] = await Promise.all([
          supabase.rpc('lupg_get_last_editor_display', {
            p_report_id: report.id,
          }),
          report.submitted_by
            ? supabase.rpc('lupg_get_submitter_display', {
                p_user_id: report.submitted_by,
              })
            : Promise.resolve({ data: null, error: null }),
        ])
        if (editor.error) throw editor.error
        if (submitter.error) throw submitter.error
        return {
          ...report,
          last_editor_display_name: (editor.data as string | null) ?? null,
          submitter_display_name: (submitter.data as string | null) ?? null,
        }
      })
    ),
    reportRows<PresentationData['programReports'][number]>(
      'lupg_program_reports'
    ),
    reportRows<PresentationData['metricReports'][number]>(
      'lupg_metric_reports'
    ),
    reportRows<PresentationData['sarprasReports'][number]>(
      'lupg_sarpras_reports'
    ),
    reportRows<PresentationData['shodaqohRows'][number]>('lupg_shodaqoh'),
    reportRows<PresentationData['mustinRows'][number]>(
      'lupg_mustin_notes',
      true
    ),
    listCharacterTargetReportsBatch(reportIds),
    listCharacterMonitoringReportsBatch(reportIds),
    kelompokIds.length
      ? readRows<SensusRow>(
          supabase
            .from('lupg_sensus')
            .select('*')
            .in('kelompok_id', kelompokIds)
        )
      : Promise.resolve([]),
    kelompokIds.length
      ? readRows<SensusCellRow>(
          supabase
            .from('lupg_sensus_participant_derived')
            .select('*')
            .in('kelompok_id', kelompokIds)
        )
      : Promise.resolve([]),
    (async () => {
      if (!reportIds.length) return []
      const rows = await readRows<{
        id: string
        caption: string | null
        storage_path: string
        report_id: string
      }>(
        supabase
          .from('lupg_activity_photos')
          .select('*')
          .in('report_id', reportIds)
          .order('report_id')
          .order('sort_order')
          .order('id')
      )
      if (!rows.length) return []
      // Signing errors retain photo slots with empty URLs, matching the web loader.
      const { data: urls } = await supabase.storage
        .from('lupg-activity-photos')
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          3600
        )
      const urlMap = new Map<string, string>()
      for (const u of urls ?? []) {
        if (u.path && u.signedUrl) urlMap.set(u.path, u.signedUrl)
      }
      return rows.map((r) => ({
        id: r.id,
        caption: r.caption,
        signedUrl: urlMap.get(r.storage_path) ?? '',
        kelompokName: kelompokId
          ? undefined
          : kelompokList.find(
              (k) =>
                k.id ===
                reports.find((report) => report.id === r.report_id)?.kelompok_id
            )?.value,
      }))
    })(),
  ])

  return {
    monthKey,
    kelompokList,
    reports: presentationReports,
    programs,
    metrics,
    sarprasItems,
    mustinTemplates,
    programReports,
    metricReports,
    sarprasReports,
    shodaqohRows,
    mustinRows,
    characterTargetItems: characterTargetData.items,
    characterTargetReports,
    characterActivities,
    characterReports,
    kelompokFilter: kelompokId,
    sensusCells: [
      ...masterSensus.filter(
        (row) => !['APR', 'AR', 'GPN_A', 'GPN_B'].includes(row.category_code)
      ),
      ...derivedSensus,
    ],
    monitoringMasterSensus: masterSensus,
    monitoringDerivedSensus: derivedSensus,
    yearlyMonthlyReports: yearlyPrograms.monthlyReports,
    yearlyProgramReports: yearlyPrograms.programReports,
    yearlyMetricMonthlyReports: yearlyMetrics.monthlyReports,
    yearlyMetricReports: yearlyMetrics.metricReports,
    yearlyShodaqohRows: yearlyShodaqoh.shodaqohRows,
    activityPhotos,
  }
}
