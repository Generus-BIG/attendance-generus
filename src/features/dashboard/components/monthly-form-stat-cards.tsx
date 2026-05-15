import { ArrowDown, ArrowUp, Info, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { KPI_DELTA_THRESHOLDS } from '../constants'
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
  format: (t: MonthlyFormRecap['totals']) => {
    display: string
    numeric: number | null
  }
  deltaUnit: 'pp' | 'count' | 'decimal'
}

const KPIS: KpiDef[] = [
  {
    key: 'meetings',
    label: 'Jumlah Pertemuan',
    description: 'Pertemuan bulan ini',
    tooltip: 'Banyaknya pertemuan yang tercatat di bulan berjalan.',
    format: (t) => ({
      display: String(t.totalMeetings),
      numeric: t.totalMeetings,
    }),
    deltaUnit: 'count',
  },
  {
    key: 'avg-hadir',
    label: 'Rata-rata Hadir',
    description: 'Peserta hadir per pertemuan',
    tooltip:
      'Rata-rata jumlah peserta yang hadir dalam setiap pertemuan.',
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
  const threshold = KPI_DELTA_THRESHOLDS[unit]
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
          <Card key={k.key} data-print-card>
            <CardContent className='p-4'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='mt-2 h-9 w-16' />
              <Skeleton className='mt-2 h-4 w-28' />
            </CardContent>
          </Card>
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
            ? 'text-success bg-success/15'
            : goodKind === 'down'
              ? 'text-destructive bg-destructive/15'
              : 'text-muted-foreground bg-muted/60'

        return (
          <Card key={k.key} data-print-card>
            <CardContent className='flex flex-col p-4'>
              <div className='flex items-center gap-1'>
                <span className='text-muted-foreground truncate text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
                  {k.label}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      aria-label={`Tentang ${k.label}`}
                      className='text-muted-foreground/60 hover:text-muted-foreground rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                    >
                      <Info className='h-3 w-3' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-[260px] text-xs'>
                    {k.tooltip}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className='mt-1.5 flex items-baseline gap-1.5'>
                <span className='text-[2.25rem] font-semibold leading-none tabular-nums'>
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
                  <Arrow className='h-3.5 w-3.5' strokeWidth={2.25} />
                  {deltaLabel}
                </span>
                {kind !== 'none' && kind !== 'flat' && (
                  <span className='text-muted-foreground'>vs bulan lalu</span>
                )}
              </div>
              <div className='text-muted-foreground mt-1.5 text-xs'>
                {k.description}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
