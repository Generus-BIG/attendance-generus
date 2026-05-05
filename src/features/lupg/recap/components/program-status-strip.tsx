import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        const Arrow =
          kind === 'up' ? ArrowUp : kind === 'down' ? ArrowDown : Minus
        const deltaTone =
          kind === 'up'
            ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-400/10'
            : kind === 'down'
              ? 'text-red-700 bg-red-500/10 dark:text-red-300 dark:bg-red-400/10'
              : 'text-muted-foreground bg-muted/60'

        return (
          <button
            key={e.kelompokId}
            type='button'
            onClick={e.onClick}
            className={cn(
              'group border-border/70 bg-background relative flex flex-col rounded-md border p-3 text-left transition-[border-color,background-color,box-shadow] duration-200',
              'hover:border-border hover:bg-muted/30',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
              e.isActive &&
                'border-foreground/80 bg-muted/40 shadow-[0_0_0_1px_var(--foreground)]'
            )}
            aria-pressed={e.onClick ? !!e.isActive : undefined}
          >
            <div className='text-muted-foreground truncate text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
              {e.kelompokName}
            </div>
            <div className='mt-1.5 flex items-baseline gap-2'>
              <span className='text-[1.75rem] font-semibold leading-none tabular-nums'>
                {e.currentPct != null ? e.currentPct : '—'}
              </span>
              {e.currentPct != null && (
                <span className='text-muted-foreground text-sm font-medium'>
                  %
                </span>
              )}
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
          </button>
        )
      })}
    </div>
  )
}
