import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { getStatus, statusBg } from '../../../utils/heatmap-buckets'
import { PROGRAM_TARGET_PCT } from '../../constants'
import { type ProgramRankedRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: ProgramRankedRow[]
  /** Target % line drawn on each row. Default 80. */
  target?: number
}

export function TileProgramRanked({
  rows,
  target = PROGRAM_TARGET_PCT,
}: Props) {
  return (
    <div className='flex h-full flex-col rounded-lg border bg-card p-4'>
      <div className='mb-3 flex items-center justify-between text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        <span>Rata² Program Desa</span>
        <span className='text-xs normal-case'>target {target}%</span>
      </div>
      <div className='flex flex-1 flex-col gap-1.5'>
        {rows.length === 0 ? (
          <div className='text-sm text-muted-foreground'>
            Tidak ada data program.
          </div>
        ) : (
          rows.map((p) => {
            const pct = p.pct ?? 0
            return (
              <Link
                key={p.code}
                to='/admin/lupg/programs'
                search={{ tab: 'kelompok' as const }}
                className='flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted focus:ring-2 focus:ring-ring focus:outline-none'
                title={`${p.name}: ${p.pct != null ? `${p.pct}%` : 'tidak ada data'} — buka tab Per Kelompok`}
              >
                <div className='min-w-0 flex-1 truncate text-xs'>{p.name}</div>
                <div className='relative h-2 w-32 overflow-hidden rounded bg-muted'>
                  <div
                    className={cn('h-full', statusBg(getStatus(p.pct)))}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                  <div
                    className='absolute top-0 bottom-0 w-px bg-foreground/50'
                    style={{ left: `${target}%` }}
                    aria-label={`Target ${target}%`}
                  />
                </div>
                <div className='w-10 text-right font-mono text-xs tabular-nums'>
                  {p.pct != null ? `${p.pct}%` : '—'}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
