import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollSpy } from '../hooks/use-scroll-spy'

export type SectionItem = {
  id: string
  label: string
}

type Props = {
  sections: SectionItem[]
}

const SCROLL_EDGE_EPSILON = 1
const NAV_CONTENT_INSET = 16
const NAV_CONTROL_INSET = 56

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Sticky section navigation. On lg+, renders a left-rail column. On smaller
 * viewports, renders a horizontal scroll strip pinned under the page header.
 */
export function SectionNav({ sections }: Props) {
  const sectionIds = useMemo(
    () => sections.map((section) => section.id),
    [sections]
  )
  const activeId = useScrollSpy({ sectionIds })
  const mobileNavRef = useRef<HTMLElement>(null)
  const mobileItemRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [scrollEdges, setScrollEdges] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  })

  const updateScrollEdges = useCallback(() => {
    const nav = mobileNavRef.current
    if (!nav) return

    const maxScrollLeft = Math.max(0, nav.scrollWidth - nav.clientWidth)
    const nextEdges = {
      canScrollLeft: nav.scrollLeft > SCROLL_EDGE_EPSILON,
      canScrollRight: nav.scrollLeft < maxScrollLeft - SCROLL_EDGE_EPSILON,
    }

    setScrollEdges((currentEdges) =>
      currentEdges.canScrollLeft === nextEdges.canScrollLeft &&
      currentEdges.canScrollRight === nextEdges.canScrollRight
        ? currentEdges
        : nextEdges
    )
  }, [])

  useEffect(() => {
    const nav = mobileNavRef.current
    if (!nav) return

    updateScrollEdges()
    window.addEventListener('resize', updateScrollEdges)
    const resizeObserver = new ResizeObserver(updateScrollEdges)
    resizeObserver.observe(nav)

    return () => {
      window.removeEventListener('resize', updateScrollEdges)
      resizeObserver.disconnect()
    }
  }, [sections, updateScrollEdges])

  useEffect(() => {
    if (!activeId) return
    const nav = mobileNavRef.current
    const activeItem = mobileItemRefs.current.get(activeId)
    if (!nav || !activeItem) return

    const navRect = nav.getBoundingClientRect()
    const activeItemRect = activeItem.getBoundingClientRect()
    const maxScrollLeft = Math.max(0, nav.scrollWidth - nav.clientWidth)
    const canScrollLeft = nav.scrollLeft > SCROLL_EDGE_EPSILON
    const canScrollRight = nav.scrollLeft < maxScrollLeft - SCROLL_EDGE_EPSILON
    const visibleLeft =
      navRect.left + (canScrollLeft ? NAV_CONTROL_INSET : NAV_CONTENT_INSET)
    const visibleRight =
      navRect.right - (canScrollRight ? NAV_CONTROL_INSET : NAV_CONTENT_INSET)

    let targetLeft = nav.scrollLeft
    if (activeItemRect.left < visibleLeft) {
      targetLeft += activeItemRect.left - visibleLeft
    } else if (activeItemRect.right > visibleRight) {
      targetLeft += activeItemRect.right - visibleRight
    } else {
      return
    }

    nav.scrollTo({
      left: Math.min(maxScrollLeft, Math.max(0, targetLeft)),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [activeId])

  const scrollMobileNav = (direction: -1 | 1) => {
    const nav = mobileNavRef.current
    if (!nav) return

    nav.scrollBy({
      left: direction * Math.max(160, nav.clientWidth * 0.72),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  const handleClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    window.dispatchEvent(new CustomEvent('lupg:reveal-section', { detail: id }))
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <>
      {/* Desktop: sticky left rail */}
      <nav
        aria-label='Navigasi seksi laporan'
        className='top-20 hidden self-start lg:sticky lg:block'
      >
        <ul className='flex flex-col gap-1'>
          {sections.map((s) => {
            const isActive = activeId === s.id
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={handleClick(s.id)}
                  className={cn(
                    'relative block rounded-md px-3 py-2 text-sm transition-colors',
                    'hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isActive
                      ? 'bg-muted font-semibold text-foreground'
                      : 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isActive && (
                    <span
                      aria-hidden='true'
                      className='absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground'
                    />
                  )}
                  {s.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Mobile + tablet: horizontal strip */}
      <div className='sticky top-16 z-20 -mx-4 w-[calc(100%+2rem)] min-w-0 lg:hidden'>
        <nav
          id='report-section-navigation'
          ref={mobileNavRef}
          aria-label='Navigasi seksi laporan'
          onScroll={updateScrollEdges}
          className='no-scrollbar flex w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain border-y border-border/60 bg-background/95 px-4 py-2 backdrop-blur'
        >
          {sections.map((s) => {
            const isActive = activeId === s.id
            return (
              <a
                key={s.id}
                ref={(element) => {
                  if (element) mobileItemRefs.current.set(s.id, element)
                  else mobileItemRefs.current.delete(s.id)
                }}
                href={`#${s.id}`}
                onClick={handleClick(s.id)}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap',
                  'transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                  'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
                aria-current={isActive ? 'true' : undefined}
              >
                {s.label}
              </a>
            )
          })}
        </nav>

        <div
          aria-hidden='true'
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-background via-background/95 to-transparent',
            'transition-opacity duration-150 motion-reduce:transition-none',
            scrollEdges.canScrollLeft ? 'opacity-100' : 'opacity-0'
          )}
        />
        <button
          type='button'
          aria-label='Geser navigasi bagian ke kiri'
          aria-controls='report-section-navigation'
          aria-hidden={!scrollEdges.canScrollLeft}
          tabIndex={scrollEdges.canScrollLeft ? 0 : -1}
          disabled={!scrollEdges.canScrollLeft}
          onClick={() => scrollMobileNav(-1)}
          className={cn(
            'absolute top-1/2 left-1.5 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-sm backdrop-blur',
            'transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            'active:scale-[0.97] motion-reduce:active:scale-100',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            scrollEdges.canScrollLeft
              ? 'opacity-100'
              : 'pointer-events-none opacity-0'
          )}
        >
          <ChevronLeft className='size-4' aria-hidden='true' />
        </button>

        <div
          aria-hidden='true'
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-background via-background/95 to-transparent',
            'transition-opacity duration-150 motion-reduce:transition-none',
            scrollEdges.canScrollRight ? 'opacity-100' : 'opacity-0'
          )}
        />
        <button
          type='button'
          aria-label='Geser navigasi bagian ke kanan'
          aria-controls='report-section-navigation'
          aria-hidden={!scrollEdges.canScrollRight}
          tabIndex={scrollEdges.canScrollRight ? 0 : -1}
          disabled={!scrollEdges.canScrollRight}
          onClick={() => scrollMobileNav(1)}
          className={cn(
            'absolute top-1/2 right-1.5 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-sm backdrop-blur',
            'transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            'active:scale-[0.97] motion-reduce:active:scale-100',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            scrollEdges.canScrollRight
              ? 'opacity-100'
              : 'pointer-events-none opacity-0'
          )}
        >
          <ChevronRight className='size-4' aria-hidden='true' />
        </button>
      </div>
    </>
  )
}
