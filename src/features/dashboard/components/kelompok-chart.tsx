'use client'

import { useQuery } from '@tanstack/react-query'
import {
  HighlightedMultiBar,
  type MultiBarRow,
  type SeriesDef,
} from '@/components/charts/highlighted-multi-bar'
import { supabase } from '@/lib/supabase'

const SERIES: SeriesDef[] = [
  { key: 'hadir', label: 'Hadir', colorToken: 'var(--chart-2)' },
  { key: 'izin', label: 'Izin', colorToken: 'var(--chart-1)' },
]

async function getKelompokStats(): Promise<MultiBarRow[]> {
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
    return []
  }

  const grouped: Record<string, { hadir: number; izin: number }> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data.forEach((item: any) => {
    const kelompok =
      item.participant?.group?.value || item.temp_group || 'Unknown'
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
    label: name,
    hadir: counts.hadir,
    izin: counts.izin,
  }))
}

export function KelompokChart() {
  const { data = [] } = useQuery({
    queryKey: ['kelompok_stats'],
    queryFn: getKelompokStats,
    refetchInterval: 30000,
  })

  return <HighlightedMultiBar data={data} series={SERIES} height={350} />
}
