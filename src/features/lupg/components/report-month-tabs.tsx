import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  currentMonthKey,
  formatMonthLabel,
  monthKeyFromDate,
} from '../utils/month-utils'

interface Props {
  availableMonths: string[]
  value: string
  onChange: (monthKey: string) => void
  className?: string
}

export function ReportMonthTabs({
  availableMonths,
  value,
  onChange,
  className,
}: Props) {
  const now = currentMonthKey()
  const listRef = useRef<HTMLDivElement>(null)

  const monthKeys = useMemo(() => {
    const set = new Set<string>()
    set.add(now)
    for (const iso of availableMonths) set.add(monthKeyFromDate(iso))
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1))
  }, [availableMonths, now])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-month="${value}"]`
    )
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = monthKeys.indexOf(value)
    if (idx < 0) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onChange(monthKeys[Math.min(idx + 1, monthKeys.length - 1)])
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onChange(monthKeys[Math.max(idx - 1, 0)])
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(monthKeys[0])
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(monthKeys[monthKeys.length - 1])
    }
  }

  return (
    <div
      ref={listRef}
      role='tablist'
      aria-label='Pilih bulan laporan'
      onKeyDown={handleKeyDown}
      className={cn(
        '-mx-2 no-scrollbar flex items-stretch gap-0.5 overflow-x-auto border-b border-border px-2',
        className
      )}
    >
      {monthKeys.map((k) => {
        const active = k === value
        const isNow = k === now
        const label = isNow ? 'Bulan ini' : formatMonthLabel(k)
        return (
          <button
            key={k}
            data-month={k}
            type='button'
            role='tab'
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(k)}
            className={cn(
              'min-h-11 shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              isNow &&
                'sticky left-0 bg-background ps-2 pe-3 shadow-[inset_-8px_0_8px_-8px_var(--border)]'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
