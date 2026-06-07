import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Loader2, Maximize2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  useActiveCharacterMonitoringActivities,
  useActiveMetrics,
  useActiveMustinTemplates,
  useActiveSarprasItems,
  useAllPrograms,
  useCharacterMonitoringReportsBatch,
  useMonthlyReports,
  useYearlyMetrics,
  useYearlyProgramData,
  useYearlyProgramDataDesa,
  useYearlyShodaqohData,
} from '../../hooks/use-lupg-queries'
import {
  type MetricReportRow,
  type MustinNoteRow,
  type ProgramReportRow,
  type SarprasReportRow,
  type SensusSnapshotRow,
  type ShodaqohRow,
} from '../../types'
import { firstDayOfMonth, formatMonthLabel } from '../../utils/month-utils'
import { buildSlides, type Kelompok } from './slides'

interface Props {
  monthKey: string
  kelompokFilter?: string
}

export function Presentation({ monthKey, kelompokFilter }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const { data: kelompokList = [] } = useQuery({
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

  const { data: reportsRaw = [] } = useMonthlyReports({
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

  // Yearly metrics + shodaqoh — only needed for kelompok mode (desa mode uses
  // current-month grouped bars). The hooks return empty arrays when kelompokId
  // is undefined, so it's safe to wire unconditionally.
  const yearlyMetricsQ = useYearlyMetrics(kelompokFilter, year)
  const yearlyShodaqohQ = useYearlyShodaqohData(kelompokFilter, year)

  const yearlyMetricReports = useMemo(
    () => (kelompokFilter ? (yearlyMetricsQ.data?.metricReports ?? []) : []),
    [kelompokFilter, yearlyMetricsQ.data?.metricReports]
  )

  const yearlyShodaqohRows = useMemo(
    () => (kelompokFilter ? (yearlyShodaqohQ.data?.shodaqohRows ?? []) : []),
    [kelompokFilter, yearlyShodaqohQ.data?.shodaqohRows]
  )

  // Presentation deck includes PHQ and SHOLAT_ACR (GMSU) per user spec, even if
  // their `active` flag is false in DB. The deck builder filters by hardcoded code list.
  const { data: programs = [] } = useAllPrograms()
  const { data: metrics = [] } = useActiveMetrics()
  const { data: sarprasItems = [] } = useActiveSarprasItems()
  const { data: mustinTemplates = [] } = useActiveMustinTemplates()
  const {
    data: characterActivities = [],
    isLoading: characterActivitiesLoading,
  } = useActiveCharacterMonitoringActivities()
  const { data: characterReports = [], isLoading: characterReportsLoading } =
    useCharacterMonitoringReportsBatch(reportIds)

  const isLoading =
    sensusQ.isLoading ||
    programsQ.isLoading ||
    metricsQ.isLoading ||
    sarprasQ.isLoading ||
    shodaqohQ.isLoading ||
    mustinQ.isLoading ||
    characterActivitiesLoading ||
    characterReportsLoading

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
        programReports: programsQ.data ?? [],
        metricReports: metricsQ.data ?? [],
        sarprasReports: sarprasQ.data ?? [],
        shodaqohRows: shodaqohQ.data ?? [],
        mustinRows: mustinQ.data ?? [],
        mustinTemplates,
        characterActivities,
        characterReports,
        kelompokFilter,
        yearlyMonthlyReports,
        yearlyProgramReports,
        yearlyMetricReports,
        yearlyShodaqohRows,
      }),
    [
      monthKey,
      kelompokList,
      reports,
      programs,
      metrics,
      sarprasItems,
      sensusQ.data,
      programsQ.data,
      metricsQ.data,
      sarprasQ.data,
      shodaqohQ.data,
      mustinQ.data,
      mustinTemplates,
      characterActivities,
      characterReports,
      kelompokFilter,
      yearlyMonthlyReports,
      yearlyProgramReports,
      yearlyMetricReports,
      yearlyShodaqohRows,
    ]
  )

  const clampedIndex = Math.min(slideIndex, Math.max(slides.length - 1, 0))
  const currentSlide = slides[clampedIndex]

  const exit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    // All roles return to the Presentation picker — admins were previously
    // sent to /admin/lupg/recap, which was disorienting because that's not
    // where they launched from.
    navigate({ to: '/admin/lupg/presentation' })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        setSlideIndex((i) => Math.min(slides.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setSlideIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'Escape') {
        e.preventDefault()
        exit()
      } else if (e.key === 'Home') {
        e.preventDefault()
        setSlideIndex(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setSlideIndex(Math.max(slides.length - 1, 0))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length])

  const requestFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen?.().catch(() => {})
    }
  }

  return (
    <div
      ref={containerRef}
      className='fixed inset-0 z-50 flex flex-col bg-background'
    >
      {!isFullscreen && (
        <div className='flex items-center justify-between border-b px-6 py-3'>
          <div className='text-sm text-muted-foreground'>
            {formatMonthLabel(monthKey)} · {currentSlide?.title ?? ''}
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={requestFullscreen}>
              <Maximize2 className='mr-2 h-4 w-4' />
              Fullscreen
            </Button>
            <Button variant='ghost' size='sm' onClick={exit}>
              <X className='mr-2 h-4 w-4' />
              Keluar
            </Button>
          </div>
        </div>
      )}

      <div className='flex flex-1 items-stretch overflow-hidden'>
        <Button
          variant='ghost'
          size='icon'
          className='h-auto w-16 rounded-none'
          onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
          disabled={clampedIndex === 0}
          aria-label='Slide sebelumnya'
        >
          <ChevronLeft className='h-6 w-6' />
        </Button>
        <div className='flex-1 overflow-hidden'>
          {isLoading || !currentSlide ? (
            <div className='flex h-full items-center justify-center text-muted-foreground'>
              <Loader2 className='mr-2 h-6 w-6 animate-spin' />
              Memuat...
            </div>
          ) : (
            currentSlide.render()
          )}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-auto w-16 rounded-none'
          onClick={() =>
            setSlideIndex((i) => Math.min(slides.length - 1, i + 1))
          }
          disabled={clampedIndex >= slides.length - 1}
          aria-label='Slide berikutnya'
        >
          <ChevronRight className='h-6 w-6' />
        </Button>
      </div>

      <div className='border-t'>
        <div
          className='h-1 bg-primary transition-all'
          style={{
            width:
              slides.length > 0
                ? `${((clampedIndex + 1) / slides.length) * 100}%`
                : '0%',
          }}
        />
        <div className='px-6 py-2 text-xs text-muted-foreground'>
          Slide {clampedIndex + 1} / {slides.length} · Gunakan ←/→ atau Space
          untuk navigasi · Esc untuk keluar
        </div>
      </div>
    </div>
  )
}
