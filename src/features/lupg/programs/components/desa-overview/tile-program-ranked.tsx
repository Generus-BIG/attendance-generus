import { cn } from '@/lib/utils'
import { getStatus } from '../../../utils/heatmap-buckets'
import { type ProgramRankedRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: ProgramRankedRow[]
  /** Target % line drawn on each row. Default 80. */
  target?: number
}

function statusBg(pct: number | null): string {
  switch (getStatus(pct)) {
    case 'ok':
      return 'bg-emerald-500'
    case 'warn':
      return 'bg-amber-500'
    case 'crit':
      return 'bg-red-500'
    default:
      return 'bg-muted'
  }
}

export function TileProgramRanked({ rows, target = 80 }: Props) {
  return (
    <div className='bg-card flex h-full flex-col rounded-lg border p-4'>
      <div className='text-muted-foreground mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide'>
        <span>Rata² Program Desa</span>
        <span className='text-[10px] normal-case'>target {target}%</span>
      </div>
      <div className='flex flex-1 flex-col gap-1.5'>
        {rows.length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            Tidak ada data program.
          </div>
        ) : (
          rows.map((p) => {
            const pct = p.pct ?? 0
            return (
              <div key={p.code} className='flex items-center gap-2'>
                <div className='min-w-0 flex-1 truncate text-xs'>{p.name}</div>
                <div className='bg-muted relative h-2 w-32 overflow-hidden rounded'>
                  <div
                    className={cn('h-full', statusBg(p.pct))}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                  <div
                    className='bg-foreground/50 absolute top-0 bottom-0 w-px'
                    style={{ left: `${target}%` }}
                    aria-label={`Target ${target}%`}
                  />
                </div>
                <div className='w-10 text-right font-mono text-xs tabular-nums'>
                  {p.pct != null ? `${p.pct}%` : '—'}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
