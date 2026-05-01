import { type BarDatum, HighlightedBar } from '@/components/charts/highlighted-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { type MonthlyFormRecap } from '../types'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
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

  for (const [group, count] of Object.entries(recap.censusByGroup ?? {})) {
    byGroup.set(group, { census: count, hadir: 0 })
  }

  for (const p of recap.participants) {
    const group = p.participantGroup?.trim() || 'Unknown'
    const current = byGroup.get(group) ?? { census: 0, hadir: 0 }
    current.hadir += p.hadirCount
    byGroup.set(group, current)
  }

  const totalMeetings = recap.totals.totalMeetings || 0

  const data: BarDatum[] = Array.from(byGroup.entries())
    .map(([group, stats]) => {
      const avgHadir = totalMeetings > 0 ? stats.hadir / totalMeetings : 0
      const percentage =
        stats.census > 0 ? Math.round((avgHadir / stats.census) * 100) : 0

      return {
        label: group,
        value: percentage,
      }
    })
    .sort((a, b) => b.value - a.value)

  if (!data.length) {
    return (
      <div className='flex h-64 items-center justify-center text-muted-foreground'>
        Belum ada data kelompok bulan ini
      </div>
    )
  }

  return (
    <div className='h-64 w-full'>
      <HighlightedBar
        data={data}
        orientation='horizontal'
        valueDomain={[0, 100]}
        valueUnit='%'
        showValueLabel
        categoryWidth={100}
        height={256}
      />
    </div>
  )
}
