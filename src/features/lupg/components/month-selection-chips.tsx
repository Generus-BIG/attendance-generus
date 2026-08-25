import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  /**
   * Cap the visible scroller width to ~this many chips. Remaining months are
   * reachable via the left/right arrow siblings. Derived at render from chip
   * metrics — no DOM measurement.
   */
  maxVisibleMonths?: number
}

function labelFor(monthKey: string, style: 'short' | 'full'): string {
  const m = parseInt(monthKey.slice(5, 7), 10)
  const full = MONTH_NAMES_ID[m - 1] ?? monthKey
  return style === 'full' ? full : full.slice(0, 3)
}

// Per-chip width is (padding 2×12px) + text width. Measured empirically for the
// compact `h-7 px-3` sizing below with a small safety margin so the 6th chip
// never clips. Gap-0.5 = 2px between chips.
const CHIP_WIDTH_PX = { short: 52, full: 96 } as const
const CHIP_GAP_PX = 2

// Advance by 3 chips per chevron click so the user always lands on a boundary
// (scroll-snap below also pins the new position to the nearest chip).
const SCROLL_STEP = (chipWidth: number) => chipWidth * 3 + CHIP_GAP_PX * 3

/**
 * Clean segmented carousel for months. Layout is:
 *
 *     [ < ]  [ Jan ] [ Feb ] ... [ Jun ]  [ > ]
 *
 * The arrow buttons are flex siblings of the scroller (not overlays), so
 * month chips can never be clipped underneath them. Arrows visually mute
 * (opacity + disabled) when there is no more content in that direction.
 */
export function MonthSelectionChips({
  months,
  selectedMonths,
  onChange,
  allowMultiple = true,
  labelStyle = 'short',
  className,
  maxMonthKey,
  maxVisibleMonths,
}: MonthSelectionChipsProps) {
  const selectedSet = new Set(selectedMonths)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 2)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, months.length])

  const perChipWidth = CHIP_WIDTH_PX[labelStyle]

  const scrollByAmount = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  // Does the control need arrows? Only when caller set maxVisibleMonths and
  // the month count exceeds it. When no overflow is expected, we render the
  // chips naturally without arrow gutters.
  const showArrows =
    maxVisibleMonths != null && months.length > maxVisibleMonths

  // Cap the scroller width via inline style when maxVisibleMonths is set.
  // e.g. 6 short chips => 6*52 + 5*2 = 322px. The extra +2px avoids sub-pixel
  // rounding clipping the last chip when zoomed or on non-integer DPR.
  const scrollerMaxWidth = showArrows
    ? maxVisibleMonths * perChipWidth +
      Math.max(0, maxVisibleMonths - 1) * CHIP_GAP_PX +
      2
    : undefined

  const step = SCROLL_STEP(perChipWidth)

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 rounded-full border bg-background px-1 py-0.5 shadow-sm',
        className
      )}
      role='group'
      aria-label='Pilih bulan'
    >
      {showArrows ? (
        <button
          type='button'
          aria-label='Geser kiri'
          onClick={() => scrollByAmount(-step)}
          disabled={!canScrollLeft}
          className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,opacity,transform] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90 disabled:pointer-events-none disabled:opacity-25'
        >
          <ChevronLeft className='h-3.5 w-3.5' />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        className='flex min-w-0 items-center gap-0.5 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden'
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory',
          maxWidth: scrollerMaxWidth,
        }}
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
              style={{ scrollSnapAlign: 'start' }}
              className={cn(
                'flex h-7 shrink-0 items-center justify-center rounded-full px-3 text-xs font-medium whitespace-nowrap transition-[background-color,color,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                !active && !disabled && 'hover:bg-muted/60',
                disabled && 'cursor-not-allowed opacity-40'
              )}
            >
              {labelFor(mk, labelStyle)}
            </button>
          )
        })}
      </div>

      {showArrows ? (
        <button
          type='button'
          aria-label='Geser kanan'
          onClick={() => scrollByAmount(step)}
          disabled={!canScrollRight}
          className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,opacity,transform] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90 disabled:pointer-events-none disabled:opacity-25'
        >
          <ChevronRight className='h-3.5 w-3.5' />
        </button>
      ) : null}
    </div>
  )
}
