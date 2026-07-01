import { lazy, Suspense } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { type Role } from '@/lib/rbac'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type PublicDashboardVisibleSections } from '@/features/dashboard-sharing/types'
import { useMonthlyFormRecap } from '../hooks/use-monthly-form-recap'
import { type MonthlyFormRecap } from '../types'
import { DashboardEmptyState } from './dashboard-empty-state'
import { DashboardSkeleton } from './dashboard-skeleton'
import { FollowUpTable } from './follow-up-table'
import { MonthlyFormStatCards } from './monthly-form-stat-cards'

const AttendanceByGroupRowChart = lazy(() =>
  import('./attendance-by-group-row-chart').then((m) => ({
    default: m.AttendanceByGroupRowChart,
  }))
)
const AttendanceCalendarHeatmap = lazy(() =>
  import('./attendance-calendar-heatmap').then((m) => ({
    default: m.AttendanceCalendarHeatmap,
  }))
)
const CategoryDistributionBar = lazy(() =>
  import('./category-distribution-bar').then((m) => ({
    default: m.CategoryDistributionBar,
  }))
)
const GenderDistributionPie = lazy(() =>
  import('./gender-distribution-pie').then((m) => ({
    default: m.GenderDistributionPie,
  }))
)
const AbsenceReasonDonut = lazy(() =>
  import('./absence-reason-donut').then((m) => ({
    default: m.AbsenceReasonDonut,
  }))
)
const EventTimelineStrip = lazy(() =>
  import('./event-timeline-strip').then((m) => ({
    default: m.EventTimelineStrip,
  }))
)

interface Props {
  formIds: string[]
  month: Date
  prevMonth: Date
  kelompokId?: string
  viewMode: 'desa' | 'kelompok'
  q: string | undefined
  fGroup: string[] | undefined
  fCategory: string[] | undefined
  onQChange: (value: string | undefined) => void
  onFGroupChange: (value: string[] | undefined) => void
  onFCategoryChange: (value: string[] | undefined) => void
  role: Role
  visibleSections?: PublicDashboardVisibleSections
  readOnly?: boolean
  providedRecap?: MonthlyFormRecap
  providedPrevRecap?: MonthlyFormRecap
  showKpiDelta?: boolean
  timelineForms?: Array<{ id: string; date: string; title: string }>
  activeMonth?: string
  onSelectMonth?: (month: string) => void
}

export function MonthlyFormDashboard({
  formIds,
  month,
  prevMonth,
  kelompokId,
  viewMode,
  q,
  fGroup,
  fCategory,
  onQChange,
  onFGroupChange,
  onFCategoryChange,
  role,
  visibleSections,
  readOnly = false,
  providedRecap,
  providedPrevRecap,
  showKpiDelta = true,
  timelineForms,
  activeMonth,
  onSelectMonth,
}: Props) {
  const currentQuery = useMonthlyFormRecap({
    formIds,
    month,
    kelompokId,
    enabled: !providedRecap,
  })
  const previousQuery = useMonthlyFormRecap({
    formIds,
    month: prevMonth,
    kelompokId,
    enabled: !providedRecap && !providedPrevRecap,
  })

  const data = providedRecap ?? currentQuery.data
  const prevData = providedPrevRecap ?? previousQuery.data
  const isLoading = providedRecap ? false : currentQuery.isLoading
  const error = providedRecap ? null : currentQuery.error
  const refetch = currentQuery.refetch
  const isDesa = viewMode === 'desa'
  const sections = visibleSections ?? {
    statCards: true,
    groupChart: true,
    calendar: true,
    categoryChart: true,
    genderChart: true,
    attendanceDistribution: true,
    followUp: true,
  }

  if (isLoading && !data) {
    return <DashboardSkeleton viewMode={viewMode} />
  }

  if (!isLoading && formIds.length === 0) {
    return (
      <DashboardEmptyState
        title='Belum ada form di bulan ini'
        description={
          isDesa
            ? 'Buat form pertemuan desa terlebih dahulu untuk mulai mencatat kehadiran.'
            : 'Belum ada form pertemuan untuk kelompok ini di bulan berjalan.'
        }
        primaryAction={
          isDesa && role !== 'team_manager' && role !== 'member'
            ? { label: 'Buat form', to: '/admin/forms', show: true }
            : undefined
        }
      />
    )
  }

  return (
    <div className='flex flex-col gap-5'>
      {sections.statCards && (
        <MonthlyFormStatCards
          recap={data}
          prevRecap={prevData}
          isLoading={isLoading}
          showDelta={showKpiDelta}
        />
      )}

      {/* Hero row.
          Desa: Per-Kelompok (2/3, hero — most actionable chart) + Calendar (1/3,
            compact widget). Calendar's narrower column naturally produces
            ~40px cells, height-matching the kelompok bar chart.
          Kelompok: Calendar (2/3, primary chart since per-kelompok bar is
            redundant in single-kelompok view) + Kategori/Gender pies stacked
            on the 1/3 right column. Pie heights together balance the
            calendar's natural height. */}
      {(sections.groupChart || sections.calendar) && (
        <Suspense fallback={<Skeleton className='h-80 w-full rounded-lg' />}>
          {isDesa ? (
            <div className='grid min-h-80 gap-4 lg:grid-cols-3'>
              {sections.groupChart && (
                <div
                  className={
                    sections.calendar ? 'lg:col-span-2' : 'lg:col-span-3'
                  }
                >
                  <AttendanceByGroupRowChart
                    recap={data}
                    isLoading={isLoading}
                  />
                </div>
              )}
              {sections.calendar && (
                <div className='flex flex-col gap-4'>
                  <AttendanceCalendarHeatmap
                    recap={data}
                    monthDate={month}
                    isLoading={isLoading}
                  />
                  {timelineForms && activeMonth && onSelectMonth && data?.meetings && data.meetings.length > 0 && (
                    <EventTimelineStrip
                      meetings={data.meetings}
                      totalCensus={data.totals.totalCensus}
                      activeMonth={activeMonth}
                      onSelectMonth={onSelectMonth}
                      forms={timelineForms}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className='grid min-h-80 gap-4 lg:grid-cols-3'>
              <div className='lg:col-span-2 flex flex-col gap-4'>
                <AttendanceCalendarHeatmap
                  recap={data}
                  monthDate={month}
                  isLoading={isLoading}
                />
                {timelineForms && activeMonth && onSelectMonth && data?.meetings && data.meetings.length > 0 && (
                  <EventTimelineStrip
                    meetings={data.meetings}
                    totalCensus={data.totals.totalCensus}
                    activeMonth={activeMonth}
                    onSelectMonth={onSelectMonth}
                    forms={timelineForms}
                  />
                )}
              </div>
              <div className='flex flex-col gap-4'>
                <CategoryDistributionBar data={data?.byCategory ?? []} />
                <GenderDistributionPie data={data?.byGender ?? []} />
              </div>
            </div>
          )}
        </Suspense>
      )}

      {isDesa &&
        (sections.categoryChart ||
          sections.genderChart ||
          sections.attendanceDistribution) && (
          <Suspense fallback={<Skeleton className='h-52 w-full rounded-lg' />}>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              {sections.categoryChart && (
                <CategoryDistributionBar data={data?.byCategory ?? []} />
              )}
              {sections.genderChart && (
                <GenderDistributionPie data={data?.byGender ?? []} />
              )}
              {sections.attendanceDistribution && (
                <AbsenceReasonDonut data={data?.byAbsenceReason ?? []} />
              )}
            </div>
          </Suspense>
        )}

      {sections.followUp && (
        <FollowUpTable
          recap={data}
          isLoading={isLoading}
          month={month}
          q={readOnly ? undefined : q}
          fGroup={readOnly ? undefined : fGroup}
          fCategory={readOnly ? undefined : fCategory}
          onQChange={readOnly ? () => undefined : onQChange}
          onFGroupChange={readOnly ? () => undefined : onFGroupChange}
          onFCategoryChange={readOnly ? () => undefined : onFCategoryChange}
        />
      )}

      {error && (
        <div className='flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3'>
          <div className='flex items-center gap-2 text-sm text-destructive'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            <span>Gagal memuat data. Periksa koneksi lalu coba lagi.</span>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='shrink-0'
          >
            <RefreshCcw className='mr-2 h-3.5 w-3.5' />
            Coba lagi
          </Button>
        </div>
      )}
    </div>
  )
}
