import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import {
  useActiveCharacterMonitoringActivities,
  useActiveMetrics,
  useActiveMustinTemplates,
  useActiveSarprasItems,
  useAllPrograms,
  useCharacterMonitoringReportsBatch,
  useCharacterTargetItemsForMonth,
  useCharacterTargetReportsBatch,
  useMonthlyReports,
  useYearlyMetrics,
  useYearlyMetricsDesa,
  useYearlyProgramData,
  useYearlyProgramDataDesa,
  useYearlyShodaqohData,
} from '../../hooks/use-lupg-queries'
import {
  type MetricReportRow,
  type MustinNoteRow,
  type ProgramReportRow,
  type SarprasReportRow,
  type SensusRow,
  type SensusSnapshotRow,
  type ShodaqohRow,
} from '../../types'
import { firstDayOfMonth } from '../../utils/month-utils'
import { PresentationPlayer } from './player'
import { type ActivityPhotoWithUrl } from './slide-renderers/render-dokumentasi'
import { buildSlides, type Kelompok } from './slides'

interface Props {
  monthKey: string
  kelompokFilter?: string
}

export function Presentation(props: Props) {
  const navigate = useNavigate()

  return (
    <PresentationLoader
      {...props}
      onExit={() =>
        navigate({
          to: '/admin/lupg/presentation',
          search: {
            month: props.monthKey,
            ...(props.kelompokFilter ? { kelompok: props.kelompokFilter } : {}),
          },
        })
      }
    />
  )
}

function PresentationLoader({
  monthKey,
  kelompokFilter,
  onExit,
}: Props & { onExit: () => void }) {
  const { data: kelompokList = [], isLoading: kelompokListLoading } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return (data ?? []) as Kelompok[]
    },
  })

  const { data: reportsRaw = [], isLoading: reportsLoading } =
    useMonthlyReports({
      kelompokId: kelompokFilter,
      fromMonth: monthKey,
      toMonth: monthKey,
    })
  const reports = reportsRaw.filter(
    (r) => r.month === firstDayOfMonth(monthKey)
  )
  const reportIds = reports.map((r) => r.id)
  const reportIdsKey = reportIds.join(',')

  const [sensusQ, programsQ, metricsQ, sarprasQ, shodaqohQ, mustinQ] =
    useQueries({
      queries: [
        {
          queryKey: [
            'lupg',
            'present',
            'sensus',
            monthKey,
            reportIdsKey,
            reportIds,
          ] as const,
          queryFn: async () => {
            if (reportIds.length === 0) return [] as SensusSnapshotRow[]
            const { data, error } = await supabase
              .from('lupg_sensus_snapshots')
              .select('*')
              .in('monthly_report_id', reportIds)
            if (error) throw error
            return (data ?? []) as SensusSnapshotRow[]
          },
          enabled: reportIds.length > 0,
        },
        {
          queryKey: [
            'lupg',
            'present',
            'programs',
            monthKey,
            reportIdsKey,
            reportIds,
          ] as const,
          queryFn: async () => {
            if (reportIds.length === 0) return [] as ProgramReportRow[]
            const { data, error } = await supabase
              .from('lupg_program_reports')
              .select('*')
              .in('monthly_report_id', reportIds)
            if (error) throw error
            return (data ?? []) as ProgramReportRow[]
          },
          enabled: reportIds.length > 0,
        },
        {
          queryKey: [
            'lupg',
            'present',
            'metrics',
            monthKey,
            reportIdsKey,
            reportIds,
          ] as const,
          queryFn: async () => {
            if (reportIds.length === 0) return [] as MetricReportRow[]
            const { data, error } = await supabase
              .from('lupg_metric_reports')
              .select('*')
              .in('monthly_report_id', reportIds)
            if (error) throw error
            return (data ?? []) as MetricReportRow[]
          },
          enabled: reportIds.length > 0,
        },
        {
          queryKey: [
            'lupg',
            'present',
            'sarpras',
            monthKey,
            reportIdsKey,
            reportIds,
          ] as const,
          queryFn: async () => {
            if (reportIds.length === 0) return [] as SarprasReportRow[]
            const { data, error } = await supabase
              .from('lupg_sarpras_reports')
              .select('*')
              .in('monthly_report_id', reportIds)
            if (error) throw error
            return (data ?? []) as SarprasReportRow[]
          },
          enabled: reportIds.length > 0,
        },
        {
          queryKey: [
            'lupg',
            'present',
            'shodaqoh',
            monthKey,
            reportIdsKey,
            reportIds,
          ] as const,
          queryFn: async () => {
            if (reportIds.length === 0) return [] as ShodaqohRow[]
            const { data, error } = await supabase
              .from('lupg_shodaqoh')
              .select('*')
              .in('monthly_report_id', reportIds)
            if (error) throw error
            return (data ?? []) as ShodaqohRow[]
          },
          enabled: reportIds.length > 0,
        },
        {
          queryKey: [
            'lupg',
            'present',
            'mustin',
            monthKey,
            reportIdsKey,
            reportIds,
          ] as const,
          queryFn: async () => {
            if (reportIds.length === 0) return [] as MustinNoteRow[]
            const { data, error } = await supabase
              .from('lupg_mustin_notes')
              .select('*')
              .in('monthly_report_id', reportIds)
              .order('sort_order')
            if (error) throw error
            return (data ?? []) as MustinNoteRow[]
          },
          enabled: reportIds.length > 0,
        },
      ],
    })

  const year = parseInt(monthKey.slice(0, 4), 10)
  const monthIndex = parseInt(monthKey.slice(5, 7), 10)

  // Yearly data for program slide charts (R3):
  // - Single-kelompok mode (kelompokFilter set): fetch 12 months for that kelompok
  // - Desa mode (no filter): fetch 12 months across all kelompoks (aggregated in slides)
  const yearlyKelompokQ = useYearlyProgramData(kelompokFilter, year)
  const yearlyDesaQ = useYearlyProgramDataDesa(year)

  const yearlyMonthlyReports = useMemo(
    () =>
      kelompokFilter
        ? (yearlyKelompokQ.data?.monthlyReports ?? [])
        : (yearlyDesaQ.data?.monthlyReports ?? []),
    [
      kelompokFilter,
      yearlyKelompokQ.data?.monthlyReports,
      yearlyDesaQ.data?.monthlyReports,
    ]
  )
  const yearlyProgramReports = useMemo(
    () =>
      kelompokFilter
        ? (yearlyKelompokQ.data?.programReports ?? [])
        : (yearlyDesaQ.data?.programReports ?? []),
    [
      kelompokFilter,
      yearlyKelompokQ.data?.programReports,
      yearlyDesaQ.data?.programReports,
    ]
  )

  // Yearly metrics feed both kelompok and desa presentation slides: the 3/5
  // month comparisons and the generus-vs-piket aggregate need historical data.
  const yearlyMetricsQ = useYearlyMetrics(kelompokFilter, year)
  const yearlyMetricsDesaQ = useYearlyMetricsDesa(year)
  const yearlyShodaqohQ = useYearlyShodaqohData(kelompokFilter, year)

  const yearlyMetricReports = useMemo(
    () =>
      kelompokFilter
        ? (yearlyMetricsQ.data?.metricReports ?? [])
        : (yearlyMetricsDesaQ.data?.metricReports ?? []),
    [
      kelompokFilter,
      yearlyMetricsQ.data?.metricReports,
      yearlyMetricsDesaQ.data?.metricReports,
    ]
  )

  const yearlyMetricMonthlyReports = useMemo(
    () =>
      kelompokFilter
        ? (yearlyMetricsQ.data?.monthlyReports ?? [])
        : (yearlyMetricsDesaQ.data?.monthlyReports ?? []),
    [
      kelompokFilter,
      yearlyMetricsQ.data?.monthlyReports,
      yearlyMetricsDesaQ.data?.monthlyReports,
    ]
  )

  const yearlyShodaqohRows = useMemo(
    () => (kelompokFilter ? (yearlyShodaqohQ.data?.shodaqohRows ?? []) : []),
    [kelompokFilter, yearlyShodaqohQ.data?.shodaqohRows]
  )

  // Presentation deck includes PHQ and SHOLAT_ACR (GMSU) per user spec, even if
  // their `active` flag is false in DB. The deck builder filters by hardcoded code list.
  const { data: programs = [], isLoading: programDefinitionsLoading } =
    useAllPrograms()
  const { data: metrics = [], isLoading: metricDefinitionsLoading } =
    useActiveMetrics()
  const { data: sarprasItems = [], isLoading: sarprasItemsLoading } =
    useActiveSarprasItems()
  const { data: mustinTemplates = [], isLoading: mustinTemplatesLoading } =
    useActiveMustinTemplates()
  const { data: characterTargetData, isLoading: characterTargetItemsLoading } =
    useCharacterTargetItemsForMonth(year, monthIndex)
  const {
    data: characterTargetReports = [],
    isLoading: characterTargetReportsLoading,
  } = useCharacterTargetReportsBatch(reportIds)
  const {
    data: characterActivities = [],
    isLoading: characterActivitiesLoading,
  } = useActiveCharacterMonitoringActivities()
  const { data: characterReports = [], isLoading: characterReportsLoading } =
    useCharacterMonitoringReportsBatch(reportIds)
  const monitoringSensusQ = useQuery({
    queryKey: [
      'lupg',
      'present',
      'monitoring-sensus',
      kelompokFilter ?? 'desa',
    ],
    queryFn: async () => {
      const kelompokIds = kelompokFilter
        ? [kelompokFilter]
        : kelompokList.map((kelompok) => kelompok.id)
      if (kelompokIds.length === 0) {
        return {
          masterSensus: [] as SensusRow[],
          derivedSensus: [] as SensusSnapshotRow[],
        }
      }
      const [master, derived] = await Promise.all([
        supabase.from('lupg_sensus').select('*').in('kelompok_id', kelompokIds),
        supabase
          .from('lupg_sensus_participant_derived')
          .select('*')
          .in('kelompok_id', kelompokIds),
      ])
      if (master.error) throw master.error
      if (derived.error) throw derived.error
      return {
        masterSensus: (master.data ?? []) as SensusRow[],
        derivedSensus: (derived.data ?? []) as Pick<
          SensusSnapshotRow,
          'kelompok_id' | 'category_code' | 'count'
        >[],
      }
    },
    enabled: kelompokList.length > 0,
  })

  // Activity photos for dokumentasi slide
  const activityPhotosQ = useQuery({
    queryKey: [
      'lupg',
      'present',
      'activity-photos',
      monthKey,
      reportIdsKey,
      reportIds,
    ] as const,
    queryFn: async (): Promise<ActivityPhotoWithUrl[]> => {
      if (reportIds.length === 0) return []
      const { data: rows, error } = await supabase
        .from('lupg_activity_photos')
        .select('*')
        .in('report_id', reportIds)
        .order('report_id')
        .order('sort_order')
        .order('id')
      if (error) throw error
      if (!rows || rows.length === 0) return []

      const paths = rows.map((r: { storage_path: string }) => r.storage_path)
      const { data: urls } = await supabase.storage
        .from('lupg-activity-photos')
        .createSignedUrls(paths, 3600)

      const urlMap = new Map<string, string>()
      for (const u of urls ?? []) {
        if (u.path && u.signedUrl) urlMap.set(u.path, u.signedUrl)
      }

      return rows.map(
        (r: { id: string; caption: string | null; storage_path: string }) => ({
          id: r.id,
          caption: r.caption,
          signedUrl: urlMap.get(r.storage_path) ?? '',
        })
      )
    },
    enabled: reportIds.length > 0,
  })

  const isLoading =
    kelompokListLoading ||
    reportsLoading ||
    sensusQ.isLoading ||
    programsQ.isLoading ||
    metricsQ.isLoading ||
    (kelompokFilter
      ? yearlyKelompokQ.isLoading ||
        yearlyMetricsQ.isLoading ||
        yearlyShodaqohQ.isLoading
      : yearlyDesaQ.isLoading || yearlyMetricsDesaQ.isLoading) ||
    programDefinitionsLoading ||
    metricDefinitionsLoading ||
    sarprasItemsLoading ||
    mustinTemplatesLoading ||
    sarprasQ.isLoading ||
    shodaqohQ.isLoading ||
    mustinQ.isLoading ||
    characterTargetItemsLoading ||
    characterTargetReportsLoading ||
    characterActivitiesLoading ||
    characterReportsLoading ||
    monitoringSensusQ.isLoading ||
    activityPhotosQ.isLoading

  const slides = useMemo(
    () =>
      buildSlides({
        monthKey,
        kelompokList,
        reports,
        programs,
        metrics,
        sarprasItems,
        sensusSnapshots: sensusQ.data ?? [],
        monitoringMasterSensus: monitoringSensusQ.data?.masterSensus ?? [],
        monitoringDerivedSensus: monitoringSensusQ.data?.derivedSensus ?? [],
        programReports: programsQ.data ?? [],
        metricReports: metricsQ.data ?? [],
        sarprasReports: sarprasQ.data ?? [],
        shodaqohRows: shodaqohQ.data ?? [],
        mustinRows: mustinQ.data ?? [],
        mustinTemplates,
        characterTargetItems: characterTargetData?.items ?? [],
        characterTargetReports,
        characterActivities,
        characterReports,
        kelompokFilter,
        yearlyMonthlyReports,
        yearlyProgramReports,
        yearlyMetricReports,
        yearlyMetricMonthlyReports,
        yearlyShodaqohRows,
        activityPhotos: activityPhotosQ.data ?? [],
      }),
    [
      monthKey,
      kelompokList,
      reports,
      programs,
      metrics,
      sarprasItems,
      sensusQ.data,
      monitoringSensusQ.data,
      programsQ.data,
      metricsQ.data,
      sarprasQ.data,
      shodaqohQ.data,
      mustinQ.data,
      mustinTemplates,
      characterTargetData?.items,
      characterTargetReports,
      characterActivities,
      characterReports,
      kelompokFilter,
      yearlyMonthlyReports,
      yearlyProgramReports,
      yearlyMetricReports,
      yearlyMetricMonthlyReports,
      yearlyShodaqohRows,
      activityPhotosQ.data,
    ]
  )

  return (
    <PresentationPlayer
      monthKey={monthKey}
      slides={slides}
      isLoading={isLoading}
      onExit={onExit}
    />
  )
}
