import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useMonthlyFormRecap } from '../hooks/use-monthly-form-recap'
import { AttendanceByGroupRowChart } from './attendance-by-group-row-chart'
import { AttendanceTrendChart } from './attendance-trend-chart'
import { FollowUpTable } from './follow-up-table'
import { MonthlyFormStatCards } from './monthly-form-stat-cards'

interface Props {
  formIds: string[]
  month: Date
  kelompokId?: string
  showGroupChart?: boolean
}

export function MonthlyFormDashboard({
  formIds,
  month,
  kelompokId,
  showGroupChart = true,
}: Props) {
  const { data, isLoading, error } = useMonthlyFormRecap({
    formIds,
    month,
    kelompokId,
  })

  return (
    <div className='space-y-4'>
      <MonthlyFormStatCards recap={data} isLoading={isLoading} />

      <div className='grid gap-4 lg:grid-cols-3'>
        <div className='lg:col-span-2'>
          <AttendanceTrendChart recap={data} isLoading={isLoading} />
        </div>
        {showGroupChart && (
          <div>
            <AttendanceByGroupRowChart recap={data} isLoading={isLoading} />
          </div>
        )}
      </div>

      <FollowUpTable recap={data} isLoading={isLoading} />

      {error && (
        <Card className='border-destructive'>
          <CardContent className='flex items-center gap-2 pt-6'>
            <AlertCircle className='h-4 w-4 text-destructive' />
            <p className='text-sm text-destructive'>
              Gagal memuat data: {error.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
