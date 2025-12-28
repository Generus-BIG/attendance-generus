'use client'

import { useMemo } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { statsService } from '@/lib/storage'

const COLORS = {
  hadir: 'var(--chart-2)',
  izin: 'var(--chart-1)',
}

export function AttendancePieChart() {
  const data = useMemo(() => {
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = endOfMonth(now)

    const summary = statsService.getAttendanceSummary(startDate, endDate)
    return [
      { name: 'Hadir', value: summary.hadir },
      { name: 'Izin', value: summary.izin },
    ]
  }, [])

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className='flex h-75 items-center justify-center text-muted-foreground'>
        Belum ada data absensi bulan ini
      </div>
    )
  }

  return (
    <ResponsiveContainer width='100%' height={300}>
      <PieChart>
        <Pie
          data={data}
          cx='50%'
          cy='50%'
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey='value'
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.name === 'Hadir' ? COLORS.hadir : COLORS.izin}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0]
              return (
                <div className='rounded-lg border bg-card px-2.5 py-2 shadow-lg dark:bg-zinc-950 dark:border-zinc-800 text-xs min-w-[120px]'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-1.5'>
                      <div
                        className='w-2 h-2 rounded-full'
                        style={{ backgroundColor: data.payload.fill || (data.name === 'Hadir' ? COLORS.hadir : COLORS.izin) }}
                      />
                      <span className='text-muted-foreground'>{data.name}</span>
                    </div>
                    <span className='font-semibold tabular-nums'>
                      {data.value} ({((data.payload.percent || (data.value as number) / total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
