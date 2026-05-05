import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRupiahShort } from '../../../utils/format-currency'
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
    return <span className='text-muted-foreground text-[10px]'>—</span>
  const isPositive = delta > 0
  const isZero = Math.abs(delta) < 0.5
  const kindUp = isPositive && !inverse
  const kindDown = !isPositive && !isZero && !inverse
  const Icon = isZero ? Minus : isPositive ? ArrowUp : ArrowDown
  const cls = isZero
    ? 'text-muted-foreground'
    : kindUp
      ? 'text-emerald-600 dark:text-emerald-400'
      : kindDown
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground'
  const sign = isZero ? '' : isPositive ? '+' : '−'
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px]', cls)}>
      <Icon className='h-2.5 w-2.5' />
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
    <div className='bg-card flex min-w-0 flex-col gap-0.5 rounded-md border p-3'>
      <div className='text-muted-foreground text-[10px] font-medium uppercase tracking-wide'>
        {label}
      </div>
      <div className='truncate font-mono text-xl font-semibold tabular-nums'>
        {value}
      </div>
      <div className='min-h-3.5'>{sub}</div>
    </div>
  )
}

export function DesaKPIStrip({ summary }: Props) {
  return (
    <div
      className='grid gap-2'
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
    >
      <Chip
        label='Rata² Desa'
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
        value={
          summary.kehadiranAvg != null ? `${summary.kehadiranAvg}%` : '—'
        }
        sub={<DeltaBadge delta={summary.deltaKehadiran} unit='%' />}
      />
      <Chip
        label='Program OK'
        value={`${summary.programOkCount}`}
        sub={
          <span className='text-muted-foreground text-[10px]'>≥ 80% target</span>
        }
      />
      <Chip
        label='Sarpras OK'
        value={`${summary.sarprasOkCount}`}
        sub={
          <span className='text-muted-foreground text-[10px]'>
            item lengkap desa
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
