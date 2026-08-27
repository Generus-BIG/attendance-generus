import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRupiahShort } from '../../../utils/format-currency'
import { PROGRAM_STATUS_THRESHOLDS } from '../../constants'
import { type DesaSummary } from '../../hooks/use-desa-overview'

interface Props {
  summary: DesaSummary
}

function DeltaBadge({
  delta,
  unit,
  inverse,
}: {
  delta: number | null
  unit: string
  inverse?: boolean
}) {
  if (delta == null)
    return <span className='text-xs text-muted-foreground'>—</span>
  const isPositive = delta > 0
  const isZero = Math.abs(delta) < 0.5
  const kindUp = isPositive && !inverse
  const kindDown = !isPositive && !isZero && !inverse
  const Icon = isZero ? Minus : isPositive ? ArrowUp : ArrowDown
  const cls = isZero
    ? 'text-muted-foreground'
    : kindUp
      ? 'text-success'
      : kindDown
        ? 'text-destructive'
        : 'text-muted-foreground'
  const sign = isZero ? '' : isPositive ? '+' : '−'
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs', cls)}>
      <Icon className='h-3 w-3' />
      <span className='tabular-nums'>
        {sign}
        {Math.abs(delta).toLocaleString('id-ID')}
        {unit}
      </span>
    </span>
  )
}

function Chip({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: React.ReactNode
}) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5 px-3 py-2 @2xl/desa:border-r @2xl/desa:last:border-r-0'>
      <div className='text-xs font-medium text-muted-foreground'>{label}</div>
      <div className='truncate text-xl font-semibold tabular-nums'>{value}</div>
      <div className='min-h-4 text-xs'>{sub}</div>
    </div>
  )
}

export function DesaKPIStrip({ summary }: Props) {
  return (
    <div className='grid grid-cols-2 divide-y rounded-lg border bg-card @md/desa:grid-cols-3 @2xl/desa:grid-cols-6 @2xl/desa:divide-y-0'>
      <Chip
        label='Rata-rata Desa'
        value={summary.desaAvg != null ? `${summary.desaAvg}%` : '—'}
        sub={<DeltaBadge delta={summary.deltaDesaAvg} unit='%' />}
      />
      <Chip
        label='Sensus Aktif'
        value={summary.sensusActive.toLocaleString('id-ID')}
        sub={<DeltaBadge delta={summary.deltaSensus} unit=' generus' />}
      />
      <Chip
        label='Kehadiran'
        value={summary.kehadiranAvg != null ? `${summary.kehadiranAvg}%` : '—'}
        sub={<DeltaBadge delta={summary.deltaKehadiran} unit='%' />}
      />
      <Chip
        label='Program Tercapai'
        value={`${summary.programOkCount}`}
        sub={
          <span className='text-muted-foreground'>
            ≥ {PROGRAM_STATUS_THRESHOLDS.ok}% target
          </span>
        }
      />
      <Chip
        label='Sarpras Lengkap'
        value={`${summary.sarprasOkCount}`}
        sub={
          <span className='text-muted-foreground'>
            item lengkap per kelompok
          </span>
        }
      />
      <Chip
        label='Shodaqoh PPG'
        value={formatRupiahShort(summary.shodaqohMtd)}
        sub={<DeltaBadge delta={summary.deltaShodaqoh} unit='%' />}
      />
    </div>
  )
}
