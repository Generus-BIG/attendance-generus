import { cn } from '@/lib/utils'

export interface ChartSegmentTooltipProps {
  label: string
  color: string
  rows: Array<{ label: string; value: string }>
  className?: string
}

/**
 * Shared tooltip body used by all dashboard distribution charts (Category Pie,
 * Gender Pie, Absence Reason Donut). Renders the same content whether triggered
 * via Recharts hover (desktop) or Popover tap (mobile) — the parent decides
 * which trigger pattern to use.
 */
export function ChartSegmentTooltip({
  label,
  color,
  rows,
  className,
}: ChartSegmentTooltipProps) {
  return (
    <div
      className={cn(
        'border-border/50 bg-background grid min-w-45 gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
        className
      )}
    >
      <div className='flex items-center gap-2'>
        <span
          aria-hidden='true'
          className='h-2 w-2 shrink-0 rounded-sm'
          style={{ backgroundColor: color }}
        />
        <span className='text-foreground font-medium'>{label}</span>
      </div>
      <div className='grid gap-1'>
        {rows.map((r) => (
          <div
            key={r.label}
            className='flex items-center justify-between gap-3'
          >
            <span className='text-muted-foreground'>{r.label}</span>
            <span className='font-mono font-medium tabular-nums'>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
