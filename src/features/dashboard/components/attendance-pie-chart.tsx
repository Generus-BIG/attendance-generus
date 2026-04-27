'use client'

import { useMemo } from 'react'
import { endOfMonth, startOfMonth } from 'date-fns'
import { HighlightedPie, type PieDatum } from '@/components/charts/highlighted-pie'
import { statsService } from '@/lib/storage'

export function AttendancePieChart() {
  const data = useMemo<PieDatum[]>(() => {
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = endOfMonth(now)

    const summary = statsService.getAttendanceSummary(startDate, endDate)
    return [
      { label: 'Hadir', value: summary.hadir, colorToken: 'var(--chart-2)' },
      { label: 'Izin', value: summary.izin, colorToken: 'var(--chart-1)' },
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

  return <HighlightedPie data={data} height={300} innerRadius={60} />
}
