import { cn } from '@/lib/utils'
import { MONTH_NAMES_ID } from '../programs/utils/editability'

export interface MonthSelectionChipsProps {
  /** Month keys in 'YYYY-MM' format. */
  months: string[]
  /** Currently selected month keys. */
  selectedMonths: string[]
  onChange: (next: string[]) => void
  allowMultiple?: boolean
  /** Short ('Jan') or full ('Januari') label. Default: 'short'. */
  labelStyle?: 'short' | 'full'
  className?: string
  /** Disable chips beyond this month key (e.g. future months). */
  maxMonthKey?: string
}

function labelFor(monthKey: string, style: 'short' | 'full'): string {
  const m = parseInt(monthKey.slice(5, 7), 10)
  const full = MONTH_NAMES_ID[m - 1] ?? monthKey
  return style === 'full' ? full : full.slice(0, 3)
}

export function MonthSelectionChips({
  months,
  selectedMonths,
  onChange,
  allowMultiple = true,
  labelStyle = 'short',
  className,
  maxMonthKey,
}: MonthSelectionChipsProps) {
  const selectedSet = new Set(selectedMonths)

  const toggle = (mk: string) => {
    if (!allowMultiple) {
      onChange([mk])
      return
    }
    const next = new Set(selectedSet)
    if (next.has(mk)) {
      if (next.size === 1) return
      next.delete(mk)
    } else {
      next.add(mk)
    }
    onChange(months.filter((m) => next.has(m)))
  }

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1.5 overflow-x-auto py-1',
        className
      )}
      role='group'
      aria-label='Pilih bulan'
    >
      {months.map((mk) => {
        const active = selectedSet.has(mk)
        const disabled = maxMonthKey ? mk > maxMonthKey : false
        return (
          <button
            key={mk}
            type='button'
            onClick={() => !disabled && toggle(mk)}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground hover:bg-muted',
              disabled && 'cursor-not-allowed opacity-40 hover:bg-background'
            )}
          >
            {labelFor(mk, labelStyle)}
          </button>
        )
      })}
    </div>
  )
}
