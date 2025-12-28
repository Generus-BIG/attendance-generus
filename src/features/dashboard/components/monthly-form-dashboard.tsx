import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DASHBOARD_FORMS, type DashboardFormKey } from '../types'
import { useMonthlyFormRecap } from '../hooks/use-monthly-form-recap'
import { MonthlyFormStatCards } from './monthly-form-stat-cards'
import { AttendanceTrendChart } from './attendance-trend-chart'
import { AttendanceByGroupRowChart } from './attendance-by-group-row-chart'
import { FollowUpTable } from './follow-up-table'

type Props = {
  formKey: DashboardFormKey
  month: Date
}

export function MonthlyFormDashboard({ formKey, month }: Props) {
  const config = DASHBOARD_FORMS[formKey]
  const { data, isLoading, error } = useMonthlyFormRecap({ formKey, month })

  return (
    <div className='space-y-4'>
      {/* Stat Cards */}
      <MonthlyFormStatCards recap={data} isLoading={isLoading} />

      {/* Charts Row */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tren per Pertemuan</CardTitle>
            <CardDescription>
              Hadir vs Izin untuk setiap tanggal pertemuan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart recap={data} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Group Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Kehadiran per Kelompok</CardTitle>
            <CardDescription>
              Perbandingan hadir vs izin berdasarkan kelompok
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceByGroupRowChart recap={data} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Table */}
      <Card>
        <CardHeader>
          <CardTitle>Perlu Follow-up</CardTitle>
          <CardDescription>Peserta dengan kehadiran terendah bulan ini</CardDescription>
        </CardHeader>
        <CardContent>
          <FollowUpTable recap={data} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className='border-destructive'>
          <CardContent className='pt-6'>
            <p className='text-sm text-destructive'>
              Gagal memuat data {config.title}: {error.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
