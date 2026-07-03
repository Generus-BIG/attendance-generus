import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, Maximize2, SlidersHorizontal, X, Minus, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AnimationProvider,
  usePresentationAnimation,
} from './context/animation-context'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  useActiveCharacterMonitoringActivities,
  useActiveMetrics,
  useActiveMustinTemplates,
  useActiveSarprasItems,
  useAllPrograms,
  useCharacterMonitoringReportsBatch,
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
  type SensusSnapshotRow,
  type ShodaqohRow,
} from '../../types'
import { firstDayOfMonth, formatMonthLabel } from '../../utils/month-utils'
import { buildSlides, type Kelompok } from './slides'
import { type ActivityPhotoWithUrl } from './slide-renderers/render-dokumentasi'

interface Props {
  monthKey: string
  kelompokFilter?: string
}

export function Presentation(props: Props) {
  return (
    <AnimationProvider>
      <PresentationInner {...props} />
    </AnimationProvider>
  )
}

function AnimationControls() {
  const {
    preset,
    setPreset,
    trigger,
    setTrigger,
    speed,
    setSpeed,
  } = usePresentationAnimation()

  const percent = ((speed - 0.25) / 2.75) * 100

  return (
    <div className='flex flex-col gap-4 text-xs select-none'>
      {/* Transition Selector */}
      <div className='space-y-1.5'>
        <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Transition</span>
        <div className='flex gap-x-4 text-xs font-semibold'>
          {(['simple', 'sleek', 'corporate', 'chill'] as const).map((p) => {
            const isActive = preset === p
            const label = p === 'simple' ? 'Simple' : p === 'sleek' ? 'Sleek' : p === 'corporate' ? 'Corporate' : 'Chill'
            return (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className='relative transition-colors duration-150 cursor-pointer py-1.5 outline-hidden'
              >
                <span
                  className={cn(
                    'transition-colors duration-150',
                    isActive ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground font-medium'
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId='activePreset'
                    className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full'
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Animate Trigger Selector */}
      <div className='space-y-1.5 border-t border-border/30 pt-3'>
        <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Animate</span>
        <div className='flex gap-x-4 text-xs font-semibold'>
          {(['both', 'enter', 'exit'] as const).map((t) => {
            const isActive = trigger === t
            const label = t === 'both' ? 'Both' : t === 'enter' ? 'On Enter' : 'On Exit'
            return (
              <button
                key={t}
                onClick={() => setTrigger(t)}
                className='relative transition-colors duration-150 cursor-pointer py-1.5 outline-hidden'
              >
                <span
                  className={cn(
                    'transition-colors duration-150',
                    isActive ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground font-medium'
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId='activeTrigger'
                    className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full'
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Speed Slider (corrected logic: left = slow, right = fast) */}
      <div className='space-y-2 border-t border-border/30 pt-3'>
        <div className='flex items-center justify-between'>
          <label className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            Speed
          </label>
          <span className='text-xs font-mono font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10'>
            {speed.toFixed(2)}x
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-[10px] text-muted-foreground font-semibold'>Slow</span>
          <input
            type='range'
            min='0.25'
            max='3.00'
            step='0.25'
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className='flex-1 appearance-none h-0.5 rounded-lg outline-hidden [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100 [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-none [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-100 [&::-moz-range-thumb]:hover:scale-125 cursor-pointer'
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, var(--border) ${percent}%, var(--border) 100%)`,
            }}
          />
          <span className='text-[10px] text-muted-foreground font-semibold'>Fast</span>
        </div>
      </div>
    </div>
  )
}

function PresentationInner({ monthKey, kelompokFilter }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const slideContainerRef = useRef<HTMLDivElement>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = next, -1 = prev
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const triggerZoomTransition = useCallback(() => {
    setIsTransitioning(true)
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false)
    }, 150) // 150ms matches the 0.15s transition
  }, [])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const resetZoomAndPan = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Trackpad pinch-to-zoom & Scroll panning listener
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isFullscreen) return
      
      if (e.ctrlKey) {
        e.preventDefault()
        const factor = 0.02
        const delta = -e.deltaY * factor
        setZoom((z) => {
          const nextZoom = Math.max(1, Math.min(4, z + delta))
          if (nextZoom === 1) {
            setPan({ x: 0, y: 0 })
          }
          return nextZoom
        })
      } else if (zoom > 1) {
        e.preventDefault()
        setPan((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }))
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [isFullscreen, zoom])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDoubleClick = () => {
    triggerZoomTransition()
    if (zoom > 1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    } else {
      setZoom(2)
      setPan({ x: 0, y: 0 })
    }
  }

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
        .order('sort_order')
      if (error) throw error
      if (!rows || rows.length === 0) return []

      const paths = rows.map(
        (r: { storage_path: string }) => r.storage_path
      )
      const { data: urls } = await supabase.storage
        .from('lupg-activity-photos')
        .createSignedUrls(paths, 3600)

      const urlMap = new Map<string, string>()
      for (const u of urls ?? []) {
        if (u.path && u.signedUrl) urlMap.set(u.path, u.signedUrl)
      }

      return rows.map(
        (r: {
          id: string
          caption: string | null
          storage_path: string
        }) => ({
          id: r.id,
          caption: r.caption,
          signedUrl: urlMap.get(r.storage_path) ?? '',
        })
      )
    },
    enabled: reportIds.length > 0,
  })

  const isLoading =
    sensusQ.isLoading ||
    programsQ.isLoading ||
    metricsQ.isLoading ||
    yearlyMetricsDesaQ.isLoading ||
    sarprasQ.isLoading ||
    shodaqohQ.isLoading ||
    mustinQ.isLoading ||
    characterActivitiesLoading ||
    characterReportsLoading ||
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
      yearlyMetricMonthlyReports,
      yearlyShodaqohRows,
      activityPhotosQ.data,
    ]
  )

  const handleNext = useCallback(() => {
    if (slideIndex < slides.length - 1) {
      setDirection(1)
      setSlideIndex((i) => i + 1)
      resetZoomAndPan()
    }
  }, [slideIndex, slides.length, resetZoomAndPan])

  const handlePrev = useCallback(() => {
    if (slideIndex > 0) {
      setDirection(-1)
      setSlideIndex((i) => i - 1)
      resetZoomAndPan()
    }
  }, [slideIndex, resetZoomAndPan])

  const clampedIndex = Math.min(slideIndex, Math.max(slides.length - 1, 0))
  const currentSlide = slides[clampedIndex]

  const exit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    // All roles return to the Presentation picker — admins were previously
    // sent to /admin/lupg/recap, which was disorienting because that's not
    // where they launched from.
    navigate({ to: '/admin/lupg/presentation' })
  }, [navigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        exit()
      } else if (e.key === 'Home') {
        e.preventDefault()
        setDirection(-1)
        setSlideIndex(0)
        resetZoomAndPan()
      } else if (e.key === 'End') {
        e.preventDefault()
        setDirection(1)
        setSlideIndex(Math.max(slides.length - 1, 0))
        resetZoomAndPan()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slides.length, handleNext, handlePrev, resetZoomAndPan, exit])

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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='ghost' size='sm'>
                  <SlidersHorizontal className='mr-2 h-4 w-4' />
                  Setting
                </Button>
              </PopoverTrigger>
              <PopoverContent align='end' className='w-60 p-4'>
                <AnimationControls />
              </PopoverContent>
            </Popover>

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
          onClick={handlePrev}
          disabled={clampedIndex === 0}
          aria-label='Slide sebelumnya'
        >
          <ChevronLeft className='h-6 w-6' />
        </Button>
        <div className='flex-1 overflow-hidden relative'>
          {isLoading || !currentSlide ? (
            <div className='flex h-full items-center justify-center text-muted-foreground'>
              <Loader2 className='mr-2 h-6 w-6 animate-spin' />
              Memuat...
            </div>
          ) : (
            <>
              <AnimatePresence mode='wait' custom={direction}>
                <motion.div
                  key={clampedIndex}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({
                      x: dir > 0 ? '5vw' : '-5vw',
                      opacity: 0,
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                    },
                    exit: (dir: number) => ({
                      x: dir > 0 ? '-5vw' : '5vw',
                      opacity: 0,
                    }),
                  }}
                  initial='enter'
                  animate='center'
                  exit='exit'
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.15 },
                  }}
                  className='h-full w-full overflow-hidden'
                >
                  <div
                    ref={slideContainerRef}
                    className={cn(
                      'h-full w-full origin-center select-none',
                      zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
                    )}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transition: isTransitioning
                        ? 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        : 'none',
                      willChange: 'transform',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onDoubleClick={handleDoubleClick}
                  >
                    {currentSlide.render()}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Floating Zoom Controls - visible during fullscreen */}
              {isFullscreen && (
                <div className='absolute bottom-6 right-6 z-50 flex items-center gap-1 bg-background/85 backdrop-blur border rounded-full px-2 py-1 shadow-lg select-none text-xs font-medium text-foreground transition-opacity hover:opacity-100 opacity-40 duration-200'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 rounded-full hover:bg-muted'
                    onClick={() => {
                      triggerZoomTransition()
                      setZoom((z) => {
                        const next = Math.max(1, z - 0.25)
                        if (next === 1) setPan({ x: 0, y: 0 })
                        return next
                      })
                    }}
                    disabled={zoom <= 1}
                  >
                    <Minus className='h-3.5 w-3.5' />
                  </Button>
                  <span className='min-w-10 text-center font-mono text-[11px] font-semibold'>
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 rounded-full hover:bg-muted'
                    onClick={() => {
                      triggerZoomTransition()
                      setZoom((z) => Math.min(4, z + 0.25))
                    }}
                    disabled={zoom >= 4}
                  >
                    <Plus className='h-3.5 w-3.5' />
                  </Button>
                  {zoom > 1 && (
                    <>
                      <span className='h-4 w-px bg-border mx-1' />
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-7 px-2.5 rounded-full text-[10px] hover:bg-muted font-bold'
                        onClick={() => {
                          triggerZoomTransition()
                          setZoom(1)
                          setPan({ x: 0, y: 0 })
                        }}
                      >
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-auto w-16 rounded-none'
          onClick={handleNext}
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
