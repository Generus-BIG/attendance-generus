import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KEHADIRAN_STATUS_THRESHOLDS } from '../../constants'
import { type KehadiranMetricRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: KehadiranMetricRow[]
}

function barColor(pct: number | null): string {
  if (pct == null) return 'bg-muted'
  if (pct >= KEHADIRAN_STATUS_THRESHOLDS.ok) return 'bg-success'
  if (pct >= KEHADIRAN_STATUS_THRESHOLDS.warn) return 'bg-warning'
  return 'bg-destructive'
}

export function TileKehadiranMetrics({ rows }: Props) {
  return (
    <div className='bg-card flex h-full flex-col rounded-lg border p-4'>
      <div className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
        Rata² Kehadiran
      </div>
      <div className='flex flex-1 flex-col gap-2'>
        {rows.length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            Tidak ada metric aktif.
          </div>
        ) : (
          rows.map((m) => {
            const pct = m.pct ?? 0
            const Icon =
              m.trend === 'up'
                ? ArrowUp
                : m.trend === 'down'
                  ? ArrowDown
                  : m.trend === 'flat'
                    ? Minus
                    : null
            return (
              <div key={m.code} className='flex items-center gap-2'>
                <div className='min-w-0 flex-1 truncate text-xs'>{m.name}</div>
                <div className='bg-muted h-1.5 w-24 overflow-hidden rounded'>
                  <div
                    className={cn('h-full', barColor(m.pct))}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className='w-10 text-right font-mono text-xs tabular-nums'>
                  {m.pct != null ? `${m.pct}%` : '—'}
                </div>
                {Icon && (
                  <Icon
                    className={cn(
                      'h-3 w-3 shrink-0',
                      m.trend === 'up'
                        ? 'text-success'
                        : m.trend === 'down'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                    )}
                  />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
