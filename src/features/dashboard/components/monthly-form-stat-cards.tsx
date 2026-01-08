import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Users, TrendingUp, Clock } from 'lucide-react'
import type { MonthlyFormRecap } from '../types'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function MonthlyFormStatCards({ recap, isLoading }: Props) {
  const t = recap?.totals

  const items = [
    {
      label: 'Jumlah Pertemuan',
      value: t?.totalMeetings ?? 0,
      icon: Calendar,
      description: 'Pertemuan bulan ini',
      iconColor: 'text-muted-foreground',
    },
    {
      label: 'Avg Hadir / Pertemuan',
      value: t?.avgHadirPerMeeting.toFixed(1) ?? '0',
      icon: Users,
      description: 'Rata-rata peserta hadir',
      iconColor: 'text-muted-foreground',
    },
    {
      label: 'Attendance Rate',
      value: formatPercent(t?.attendanceRate ?? 0),
      icon: TrendingUp,
      description: 'Tingkat kehadiran',
      iconStyle: { color: 'var(--chart-2)' },
    },
    {
      label: 'Izin Rate',
      value: formatPercent(t?.izinRate ?? 0),
      icon: Clock,
      description: 'Tingkat izin',
      iconStyle: { color: 'var(--chart-1)' },
    },
  ]

  if (isLoading) {
    return (
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{item.label}</CardTitle>
              <item.icon className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-20' />
              <Skeleton className='mt-1 h-4 w-32' />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{item.label}</CardTitle>
            <item.icon 
              className={`h-4 w-4 ${item.iconColor || ''}`} 
              style={item.iconStyle}
            />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{item.value}</div>
            <p className='text-xs text-muted-foreground'>{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
