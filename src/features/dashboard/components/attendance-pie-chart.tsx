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
  hadir: '#14b8a6',
  izin: '#f59e0b',
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
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
