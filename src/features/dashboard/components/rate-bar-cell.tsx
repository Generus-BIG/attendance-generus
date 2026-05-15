import { cn } from '@/lib/utils'
import { AT_RISK_RATE_PCT } from '../constants'
import { isPastMidMonth } from '../utils/mid-month'

interface Props {
  /** Rate as a percentage (0–100). */
  ratePct: number
  /** The month this rate refers to. Used to decide whether to flag low values. */
  month: Date
}

/**
 * Continuous-encoding rate cell: a thin track with a filled segment + tabular
 * figure. Renders muted by default; only flags red when `ratePct < 25` AND the
 * month is past its midpoint (operators need not worry about early-month zeros).
 */
export function RateBarCell({ ratePct, month }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(ratePct)))
  const isAtRisk = clamped < AT_RISK_RATE_PCT && isPastMidMonth(month)

  return (
    <div className='flex items-center justify-end gap-2'>
      <div
        className='bg-muted/70 hidden h-1.5 w-24 overflow-hidden rounded-full sm:block'
        role='presentation'
        aria-hidden='true'
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            isAtRisk ? 'bg-destructive/80' : 'bg-foreground/70'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span
        className={cn(
          'w-10 text-right text-sm tabular-nums',
          isAtRisk ? 'text-destructive font-semibold' : 'text-foreground'
        )}
        aria-label={
          isAtRisk ? `${clamped}% — perlu tindak lanjut` : undefined
        }
      >
        {clamped}%
      </span>
    </div>
  )
}
