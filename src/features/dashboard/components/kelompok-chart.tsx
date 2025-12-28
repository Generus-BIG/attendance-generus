'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'

const COLORS = {
  hadir: 'var(--chart-2)',
  izin: 'var(--chart-1)',
}

async function getKelompokStats() {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      status,
      participant:participants!attendance_participant_id_fkey(
        group:group_id(value)
      ),
      temp_group
    `)

  if (error) {
    console.error('Error fetching kelompok stats:', error)
    return []
  }

  const grouped: Record<string, { hadir: number; izin: number }> = {}

  data.forEach((item: any) => {
    const kelompok = item.participant?.group?.value || item.temp_group || 'Unknown'
    if (!grouped[kelompok]) {
      grouped[kelompok] = { hadir: 0, izin: 0 }
    }
    if (item.status === 'HADIR') {
      grouped[kelompok].hadir++
    } else if (item.status === 'IZIN') {
      grouped[kelompok].izin++
    }
  })

  return Object.entries(grouped).map(([name, counts]) => ({
    name,
    ...counts,
  }))
}

export function KelompokChart() {
  const { data = [] } = useQuery({
    queryKey: ['kelompok_stats'],
    queryFn: getKelompokStats,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
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
                        <span className='text-muted-foreground'>{entry.name}</span>
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
        <Legend />
        <Bar dataKey='hadir' name='Hadir' fill={COLORS.hadir} radius={[4, 4, 0, 0]} />
        <Bar dataKey='izin' name='Izin' fill={COLORS.izin} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
