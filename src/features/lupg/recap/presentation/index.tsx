import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  useActiveMetrics,
  useActivePrograms,
  useActiveSarprasItems,
  useMonthlyReports,
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
}

export function Presentation({ monthKey }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [slideIndex, setSlideIndex] = useState(0)

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
          queryKey: ['lupg', 'present', 'sensus', monthKey, reportIdsKey],
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
          queryKey: ['lupg', 'present', 'programs', monthKey, reportIdsKey],
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
          queryKey: ['lupg', 'present', 'metrics', monthKey, reportIdsKey],
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
          queryKey: ['lupg', 'present', 'sarpras', monthKey, reportIdsKey],
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
          queryKey: ['lupg', 'present', 'shodaqoh', monthKey, reportIdsKey],
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
          queryKey: ['lupg', 'present', 'mustin', monthKey, reportIdsKey],
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

  const { data: programs = [] } = useActivePrograms()
  const { data: metrics = [] } = useActiveMetrics()
  const { data: sarprasItems = [] } = useActiveSarprasItems()

  const isLoading =
    sensusQ.isLoading ||
    programsQ.isLoading ||
    metricsQ.isLoading ||
    sarprasQ.isLoading ||
    shodaqohQ.isLoading ||
    mustinQ.isLoading

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
    ]
  )

  const clampedIndex = Math.min(slideIndex, Math.max(slides.length - 1, 0))
  const currentSlide = slides[clampedIndex]

  const exit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    navigate({
      to: '/admin/lupg/recap',
      search: { month: monthKey },
    })
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
      className='bg-background fixed inset-0 z-50 flex flex-col'
    >
      <div className='flex items-center justify-between border-b px-6 py-3'>
        <div className='text-muted-foreground text-sm'>
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
        <div className='flex-1 overflow-auto p-10'>
          {isLoading || !currentSlide ? (
            <div className='text-muted-foreground flex h-full items-center justify-center'>
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
          className='bg-primary h-1 transition-all'
          style={{
            width:
              slides.length > 0
                ? `${((clampedIndex + 1) / slides.length) * 100}%`
                : '0%',
          }}
        />
        <div className='text-muted-foreground px-6 py-2 text-xs'>
          Slide {clampedIndex + 1} / {slides.length} · Gunakan ←/→ atau Space
          untuk navigasi · Esc untuk keluar
        </div>
      </div>
    </div>
  )
}
