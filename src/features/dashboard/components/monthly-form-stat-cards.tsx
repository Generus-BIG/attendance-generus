import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MonthlyFormRecap } from '../types'

type Props = {
  recap: MonthlyFormRecap | undefined
  prevRecap?: MonthlyFormRecap | undefined
  isLoading: boolean
}

type KpiDef = {
  key: string
  label: string
  description: string
  tooltip: string
  format: (t: MonthlyFormRecap['totals']) => { display: string; numeric: number | null }
  deltaUnit: 'pp' | 'count' | 'decimal'
}

const KPIS: KpiDef[] = [
  {
    key: 'meetings',
    label: 'Jumlah Pertemuan',
    description: 'Pertemuan bulan ini',
    tooltip: 'Banyaknya pertemuan yang tercatat di bulan berjalan.',
    format: (t) => ({ display: String(t.totalMeetings), numeric: t.totalMeetings }),
    deltaUnit: 'count',
  },
  {
    key: 'avg-hadir',
    label: 'Rata-rata Hadir',
    description: 'Peserta hadir per pertemuan',
    tooltip: 'Rata-rata jumlah peserta yang hadir dalam setiap pertemuan.',
    format: (t) => ({
      display: t.avgHadirPerMeeting.toFixed(1),
      numeric: t.avgHadirPerMeeting,
    }),
    deltaUnit: 'decimal',
  },
  {
    key: 'attendance-rate',
    label: 'Tingkat Kehadiran',
    description: 'Hadir vs sensus bulan ini',
    tooltip:
      'Persentase kehadiran dihitung dari total hadir dibagi (pertemuan × sensus).',
    format: (t) => ({
      display: `${Math.round(t.attendanceRate * 100)}%`,
      numeric: t.attendanceRate * 100,
    }),
    deltaUnit: 'pp',
  },
  {
    key: 'izin-rate',
    label: 'Tingkat Izin',
    description: 'Izin vs sensus bulan ini',
    tooltip:
      'Persentase izin dihitung dari total izin dibagi (pertemuan × sensus).',
    format: (t) => ({
      display: `${Math.round(t.izinRate * 100)}%`,
      numeric: t.izinRate * 100,
    }),
    deltaUnit: 'pp',
  },
]

function formatDelta(
  delta: number | null,
  unit: KpiDef['deltaUnit']
): { label: string; kind: 'up' | 'down' | 'flat' | 'none' } {
  if (delta == null || Number.isNaN(delta)) return { label: '—', kind: 'none' }
  const threshold = unit === 'pp' ? 0.5 : unit === 'decimal' ? 0.05 : 0.5
  if (Math.abs(delta) < threshold) return { label: 'Stabil', kind: 'flat' }
  const sign = delta > 0 ? '+' : '−'
  const magnitude = Math.abs(delta)
  const suffix = unit === 'pp' ? 'pp' : ''
  const formatted =
    unit === 'decimal'
      ? magnitude.toFixed(1)
      : unit === 'pp'
        ? magnitude.toFixed(1)
        : String(Math.round(magnitude))
  return {
    label: `${sign}${formatted}${suffix}`,
    kind: delta > 0 ? 'up' : 'down',
  }
}

export function MonthlyFormStatCards({ recap, prevRecap, isLoading }: Props) {
  if (isLoading) {
    return (
      <div
        className='grid gap-2'
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
      >
        {KPIS.map((k) => (
          <div
            key={k.key}
            className='border-border/70 bg-background rounded-md border p-3'
          >
            <Skeleton className='h-3 w-24' />
            <Skeleton className='mt-2 h-7 w-16' />
            <Skeleton className='mt-2 h-4 w-28' />
          </div>
        ))}
      </div>
    )
  }

  const t = recap?.totals
  const pt = prevRecap?.totals

  return (
    <div
      className='grid gap-2'
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
    >
      {KPIS.map((k) => {
        const current = t ? k.format(t) : { display: '—', numeric: null }
        const prev = pt ? k.format(pt) : { display: '—', numeric: null }
        const delta =
          current.numeric != null && prev.numeric != null
            ? current.numeric - prev.numeric
            : null
        const { label: deltaLabel, kind } = formatDelta(delta, k.deltaUnit)
        const Arrow =
          kind === 'up' ? ArrowUp : kind === 'down' ? ArrowDown : Minus

        // For Izin, "up" is bad; for every other KPI, "up" is good.
        const isIzin = k.key === 'izin-rate'
        const goodKind =
          kind === 'flat' || kind === 'none'
            ? kind
            : (kind === 'up') === !isIzin
              ? 'up'
              : 'down'

        const deltaTone =
          goodKind === 'up'
            ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-400/10'
            : goodKind === 'down'
              ? 'text-red-700 bg-red-500/10 dark:text-red-300 dark:bg-red-400/10'
              : 'text-muted-foreground bg-muted/60'

        return (
          <div
            key={k.key}
            className='border-border/70 bg-background flex flex-col rounded-md border p-3'
          >
            <div
              className='text-muted-foreground truncate text-[0.6875rem] font-medium uppercase tracking-[0.12em]'
              title={k.tooltip}
            >
              {k.label}
            </div>
            <div className='mt-1.5 flex items-baseline gap-1.5'>
              <span className='text-[1.75rem] font-semibold leading-none tabular-nums'>
                {current.display}
              </span>
            </div>
            <div className='mt-2 flex items-center gap-2 text-xs'>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium tabular-nums',
                  deltaTone
                )}
              >
                <Arrow className='h-3 w-3' strokeWidth={2.5} />
                {deltaLabel}
              </span>
              {kind !== 'none' && kind !== 'flat' && (
                <span className='text-muted-foreground'>vs bulan lalu</span>
              )}
            </div>
            <div className='text-muted-foreground mt-1.5 text-xs'>
              {k.description}
            </div>
          </div>
        )
      })}
    </div>
  )
}
