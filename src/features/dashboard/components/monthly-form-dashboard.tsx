import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMonthlyFormRecap } from '../hooks/use-monthly-form-recap'
import { AbsenceReasonDonut } from './absence-reason-donut'
import { AttendanceByGroupRowChart } from './attendance-by-group-row-chart'
import { AttendanceCalendarHeatmap } from './attendance-calendar-heatmap'
import { CategoryDistributionBar } from './category-distribution-bar'
import { FollowUpTable } from './follow-up-table'
import { GenderDistributionPie } from './gender-distribution-pie'
import { MonthlyFormStatCards } from './monthly-form-stat-cards'

interface Props {
  formIds: string[]
  month: Date
  prevMonth: Date
  kelompokId?: string
  viewMode: 'desa' | 'kelompok'
}

export function MonthlyFormDashboard({
  formIds,
  month,
  prevMonth,
  kelompokId,
  viewMode,
}: Props) {
  const { data, isLoading, error, refetch } = useMonthlyFormRecap({
    formIds,
    month,
    kelompokId,
  })
  const { data: prevData } = useMonthlyFormRecap({
    formIds,
    month: prevMonth,
    kelompokId,
  })

  const isDesa = viewMode === 'desa'

  return (
    <div className='flex flex-col gap-5'>
      <MonthlyFormStatCards
        recap={data}
        prevRecap={prevData}
        isLoading={isLoading}
      />

      {/* Hero row.
          Desa: Per-Kelompok (2/3, hero — most actionable chart) + Calendar (1/3,
            compact widget). Calendar's narrower column naturally produces
            ~40px cells, height-matching the kelompok bar chart.
          Kelompok: Calendar (2/3, primary chart since per-kelompok bar is
            redundant in single-kelompok view) + Kategori/Gender pies stacked
            on the 1/3 right column. Pie heights together balance the
            calendar's natural height. */}
      {isDesa ? (
        <div className='grid gap-4 lg:grid-cols-3'>
          <div className='lg:col-span-2'>
            <AttendanceByGroupRowChart recap={data} isLoading={isLoading} />
          </div>
          <AttendanceCalendarHeatmap
            recap={data}
            monthDate={month}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <div className='grid gap-4 lg:grid-cols-3'>
          <div className='lg:col-span-2'>
            <AttendanceCalendarHeatmap
              recap={data}
              monthDate={month}
              isLoading={isLoading}
            />
          </div>
          <div className='flex flex-col gap-4'>
            <CategoryDistributionBar data={data?.byCategory ?? []} />
            <GenderDistributionPie data={data?.byGender ?? []} />
          </div>
        </div>
      )}

      {/* Distribution row (Desa only) — Kategori + Gender + Absence as a
          balanced 3-up. Eliminates the orphan absence donut row. */}
      {isDesa && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <CategoryDistributionBar data={data?.byCategory ?? []} />
          <GenderDistributionPie data={data?.byGender ?? []} />
          <AbsenceReasonDonut data={data?.byAbsenceReason ?? []} />
        </div>
      )}

      <FollowUpTable recap={data} isLoading={isLoading} month={month} />

      {error && (
        <div className='border-destructive/40 bg-destructive/5 flex items-center justify-between gap-3 rounded-md border px-4 py-3'>
          <div className='text-destructive flex items-center gap-2 text-sm'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            <span>
              Gagal memuat data. Periksa koneksi lalu coba lagi.
            </span>
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
