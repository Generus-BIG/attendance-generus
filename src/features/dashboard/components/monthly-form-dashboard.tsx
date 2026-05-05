import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMonthlyFormRecap } from '../hooks/use-monthly-form-recap'
import { AttendanceByGroupRowChart } from './attendance-by-group-row-chart'
import { AttendanceCalendarHeatmap } from './attendance-calendar-heatmap'
import { FollowUpTable } from './follow-up-table'
import { MonthlyFormStatCards } from './monthly-form-stat-cards'

interface Props {
  formIds: string[]
  month: Date
  prevMonth: Date
  kelompokId?: string
  showGroupChart?: boolean
}

export function MonthlyFormDashboard({
  formIds,
  month,
  prevMonth,
  kelompokId,
  showGroupChart = true,
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

  return (
    <div className='flex flex-col gap-5'>
      <MonthlyFormStatCards
        recap={data}
        prevRecap={prevData}
        isLoading={isLoading}
      />

      <div
        className={
          showGroupChart
            ? 'grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]'
            : 'grid gap-4'
        }
      >
        <AttendanceCalendarHeatmap
          recap={data}
          monthDate={month}
          isLoading={isLoading}
        />
        {showGroupChart && (
          <AttendanceByGroupRowChart recap={data} isLoading={isLoading} />
        )}
      </div>

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
