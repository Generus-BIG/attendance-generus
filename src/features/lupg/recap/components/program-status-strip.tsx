import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatus, statusRailClass } from '../utils/heatmap-buckets'

export interface StatusStripEntry {
  kelompokId: string
  kelompokName: string
  currentPct: number | null
  prevPct: number | null
  onClick?: () => void
  isActive?: boolean
}

interface Props {
  entries: StatusStripEntry[]
}

function formatDelta(delta: number | null): {
  label: string
  kind: 'up' | 'down' | 'flat' | 'none'
} {
  if (delta == null || Number.isNaN(delta)) return { label: '—', kind: 'none' }
  if (Math.abs(delta) < 0.5) return { label: 'Stabil', kind: 'flat' }
  const sign = delta > 0 ? '+' : '−'
  return {
    label: `${sign}${Math.abs(delta).toFixed(1)}`,
    kind: delta > 0 ? 'up' : 'down',
  }
}

export function ProgramStatusStrip({ entries }: Props) {
  return (
    <div
      className='grid gap-2'
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
    >
      {entries.map((e) => {
        const delta =
          e.currentPct != null && e.prevPct != null
            ? e.currentPct - e.prevPct
            : null
        const { label: deltaLabel, kind } = formatDelta(delta)
        const status = getStatus(e.currentPct)
        const Arrow =
          kind === 'up' ? ArrowUp : kind === 'down' ? ArrowDown : Minus
        const deltaColor =
          kind === 'up'
            ? 'text-emerald-600 dark:text-emerald-400'
            : kind === 'down'
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground'

        return (
          <button
            key={e.kelompokId}
            type='button'
            onClick={e.onClick}
            className={cn(
              'bg-card rounded-md border p-3 text-left transition-colors',
              statusRailClass(status),
              e.onClick && 'hover:bg-muted/50 cursor-pointer',
              e.isActive && 'ring-ring ring-2 ring-offset-2'
            )}
            aria-pressed={e.onClick ? !!e.isActive : undefined}
          >
            <div className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
              {e.kelompokName}
            </div>
            <div className='mt-1 flex items-baseline gap-2'>
              <span className='font-mono text-2xl font-semibold tabular-nums'>
                {e.currentPct != null ? `${e.currentPct}%` : '—'}
              </span>
            </div>
            <div
              className={cn(
                'mt-0.5 inline-flex items-center gap-1 text-xs',
                deltaColor
              )}
            >
              <Arrow className='h-3 w-3' />
              <span className='tabular-nums'>{deltaLabel}</span>
              {kind !== 'none' && kind !== 'flat' && (
                <span className='text-muted-foreground'>vs bulan lalu</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
