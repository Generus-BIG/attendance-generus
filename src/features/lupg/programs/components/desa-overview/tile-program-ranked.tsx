import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { getStatus, statusBg } from '../../../utils/heatmap-buckets'
import { PROGRAM_TARGET_PCT } from '../../constants'
import { type ProgramRankedRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: ProgramRankedRow[]
  /** Target % line drawn on each row. Default 80. */
  target?: number
  readOnly?: boolean
}

export function TileProgramRanked({
  rows,
  target = PROGRAM_TARGET_PCT,
  readOnly,
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
            const content = (
              <div className='flex items-center gap-2 rounded px-1 py-0.5'>
                <div className='min-w-0 flex-1 truncate text-xs'>{p.name}</div>
                <div
                  className='relative flex h-2 w-32 items-center overflow-hidden rounded bg-muted'
                  role='img'
                  aria-label={`${p.name}: ${p.pct == null ? 'tidak ada data' : `${p.pct}%`}`}
                >
                  {p.pct == null ? (
                    <span className='sr-only'>Tidak ada data</span>
                  ) : (
                    <div
                      className={cn('h-full', statusBg(getStatus(p.pct)))}
                      style={{ width: `${Math.min(100, p.pct)}%` }}
                    />
                  )}
                  <div
                    className='absolute top-0 bottom-0 w-px bg-foreground/50'
                    style={{ left: `${target}%` }}
                    aria-label={`Target ${target}%`}
                  />
                </div>
                <div className='w-10 text-right font-mono text-xs tabular-nums'>
                  {p.pct != null ? `${p.pct}%` : '—'}
                </div>
              </div>
            )
            return (
              <div
                key={p.code}
                className={
                  readOnly
                    ? ''
                    : 'rounded focus-within:ring-2 focus-within:ring-ring hover:bg-muted'
                }
              >
                {readOnly ? (
                  content
                ) : (
                  <Link
                    to='/admin/lupg/programs'
                    search={{ tab: 'kelompok' as const }}
                    className='block focus-visible:outline-none'
                    title={`${p.name}: ${p.pct != null ? `${p.pct}%` : 'tidak ada data'} — buka tab Per Kelompok`}
                  >
                    {content}
                  </Link>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
