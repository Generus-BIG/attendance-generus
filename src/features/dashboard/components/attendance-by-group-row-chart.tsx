import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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

type GroupRow = {
  group: string
  census: number
  totalHadir: number
  avgHadir: number
  percentage: number
}

type TooltipEntry = {
  name?: string
  value?: number
  color?: string
  payload?: GroupRow
}

const COLORS = {
  percentage: 'var(--chart-2)',
}

export function AttendanceByGroupRowChart({ recap, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className='h-64 w-full' />
  }

  if (!recap?.participants.length) {
    return (
      <div className='flex h-64 items-center justify-center text-muted-foreground'>
        Belum ada data peserta bulan ini
      </div>
    )
  }

  const byGroup = new Map<string, { census: number; hadir: number }>()

  // 1. Seed census counts from realtime participants (dashboard recap)
  for (const [group, count] of Object.entries(recap.censusByGroup ?? {})) {
    byGroup.set(group, { census: count, hadir: 0 })
  }

  // 2. Add total hadir per group from attendance recap
  for (const p of recap.participants) {
    const group = p.participantGroup?.trim() || 'Unknown'
    const current = byGroup.get(group) ?? { census: 0, hadir: 0 }
    current.hadir += p.hadirCount
    byGroup.set(group, current)
  }

  const totalMeetings = recap.totals.totalMeetings || 0

  // 3. Calculate percentage: (Average Hadir per meeting / Census) * 100
  const data: GroupRow[] = Array.from(byGroup.entries())
    .map(([group, stats]) => {
      const avgHadir = totalMeetings > 0 ? stats.hadir / totalMeetings : 0
      const percentage = stats.census > 0 
        ? Math.round((avgHadir / stats.census) * 100) 
        : 0
      
      return {
        group,
        census: stats.census,
        totalHadir: stats.hadir,
        avgHadir,
        percentage,
      }
    })
    .sort((a, b) => b.percentage - a.percentage)

  if (!data.length) {
    return (
      <div className='flex h-64 items-center justify-center text-muted-foreground'>
        Belum ada data kelompok bulan ini
      </div>
    )
  }

  return (
    <div className='h-64 w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          layout='vertical'
          data={data}
          margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
          barCategoryGap='25%'
        >
          <CartesianGrid strokeDasharray='3 3' horizontal={false} className='stroke-muted' />
          <XAxis
            type='number'
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className='text-muted-foreground'
            unit='%'
          />
          <YAxis
            type='category'
            dataKey='group'
            width={100}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className='text-muted-foreground'
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
            content={({ active, payload, label }) => {
              const entries = (payload ?? []) as TooltipEntry[]
              if (active && entries.length) {
                const row = entries[0].payload
                return (
                  <div className='rounded-lg border bg-card px-2.5 py-2 shadow-lg dark:bg-zinc-950 dark:border-zinc-800 text-xs min-w-35'>
                    <p className='font-semibold mb-1.5 text-foreground'>{String(label)}</p>
                    <div className='space-y-1'>
                      <div className='flex justify-between gap-4'>
                        <span className='text-muted-foreground'>Persentase:</span>
                        <span className='font-mono font-bold'>{row?.percentage}%</span>
                      </div>
                      <div className='flex justify-between gap-4'>
                        <span className='text-muted-foreground'>Total Hadir:</span>
                        <span className='font-mono'>{row?.totalHadir}</span>
                      </div>
                      <div className='flex justify-between gap-4'>
                        <span className='text-muted-foreground'>Rata-rata Hadir:</span>
                        <span className='font-mono'>
                          {row?.avgHadir?.toFixed(1) ?? '0'}
                        </span>
                      </div>
                      <div className='flex justify-between gap-4'>
                        <span className='text-muted-foreground'>Jumlah Sensus:</span>
                        <span className='font-mono'>{row?.census} orang</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey='percentage' fill={COLORS.percentage} radius={[0, 4, 4, 0]}>
            <LabelList 
              dataKey='percentage' 
              position='right' 
              formatter={(val) => `${val}%`}
              fontSize={11}
              className='fill-foreground'
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
