import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  HighlightedMultiBar,
  type MultiBarRow,
  type SeriesDef,
} from '@/components/charts/highlighted-multi-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { type MonthlyFormRecap } from '../types'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
}

const SERIES: SeriesDef[] = [
  { key: 'hadir', label: 'Hadir', colorToken: 'var(--chart-2)' },
  { key: 'izin', label: 'Izin', colorToken: 'var(--chart-1)' },
]

export function AttendanceTrendChart({ recap, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className='h-64 w-full' />
  }

  if (!recap?.meetings.length) {
    return (
      <div className='flex h-64 items-center justify-center text-muted-foreground'>
        Belum ada data pertemuan bulan ini
      </div>
    )
  }

  const chartData: MultiBarRow[] = recap.meetings.map((m) => ({
    label: format(new Date(m.date), 'dd MMM', { locale: idLocale }),
    hadir: m.hadir,
    izin: m.izin,
  }))

  return (
    <div className='h-64 w-full'>
      <div className='mx-auto h-full w-full max-w-2xl'>
        <HighlightedMultiBar data={chartData} series={SERIES} height={256} />
      </div>
    </div>
  )
}
