import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { MonthlyFormRecap } from '../types'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
}

const COLORS = {
  hadir: 'var(--chart-2)',
  izin: 'var(--chart-1)',
}

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

  // Format dates for display
  const chartData = recap.meetings.map((m) => ({
    ...m,
    dateLabel: format(new Date(m.date), 'dd MMM', { locale: idLocale }),
  }))

  return (
    <div className='h-64 w-full'>
      <div className='mx-auto h-full w-full max-w-2xl'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            barSize={60}
            barGap={6}
          >
            <CartesianGrid strokeDasharray='3 3' vertical={false} className='stroke-muted' />
            <XAxis
              dataKey='dateLabel'
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              className='text-muted-foreground'
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={false}
              className='text-muted-foreground' 
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className='rounded-lg border bg-card px-2.5 py-2 shadow-lg dark:bg-zinc-950 dark:border-zinc-800 text-xs min-w-[120px]'>
                      <p className='font-semibold mb-1.5 text-foreground'>{label}</p>
                      {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
                        <div key={index} className='flex items-center justify-between gap-3'>
                          <div className='flex items-center gap-1.5'>
                            <div
                              className='w-2 h-2 rounded-full'
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className='text-muted-foreground capitalize'>
                              {entry.name === 'hadir' ? 'Hadir' : 'Izin'}
                            </span>
                          </div>
                          <span className='font-semibold tabular-nums'>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              formatter={(value) => (value === 'hadir' ? 'Hadir' : 'Izin')}
              wrapperStyle={{ paddingTop: '10px' }}
            />
            <Bar dataKey='hadir' fill={COLORS.hadir} radius={[4, 4, 0, 0]}>
              <LabelList dataKey='hadir' position='top' fontSize={10} />
            </Bar>
            <Bar dataKey='izin' fill={COLORS.izin} radius={[4, 4, 0, 0]}>
              <LabelList dataKey='izin' position='top' fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
