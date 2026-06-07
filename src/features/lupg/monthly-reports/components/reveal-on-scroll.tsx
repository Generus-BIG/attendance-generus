import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: React.ReactNode
  delayMs?: number
  className?: string
}

/**
 * Fades children in + translates from 8px down when they enter the viewport.
 * Uses IntersectionObserver; respects prefers-reduced-motion.
 */
export function RevealOnScroll({ children, delayMs = 0, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [revealed, setRevealed] = useState(() => {
    if (typeof window === 'undefined') return false
    // Honor reduced-motion: reveal immediately, no animation.
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const revealIfContainsSection = (sectionId: string | null) => {
      if (!sectionId) return
      const el = ref.current
      const target = document.getElementById(sectionId)
      if (el && target && el.contains(target)) setRevealed(true)
    }

    revealIfContainsSection(window.location.hash.slice(1) || null)

    const handleReveal = (event: Event) => {
      const sectionId =
        event instanceof CustomEvent && typeof event.detail === 'string'
          ? event.detail
          : null
      revealIfContainsSection(sectionId)
    }

    window.addEventListener('lupg:reveal-section', handleReveal)
    return () => {
      window.removeEventListener('lupg:reveal-section', handleReveal)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = ref.current
    if (!el) return
    // If reduced-motion is preferred, state was seeded true; skip observer.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delayMs > 0) {
              window.setTimeout(() => setRevealed(true), delayMs)
            } else {
              setRevealed(true)
            }
            observer.unobserve(entry.target)
            return
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delayMs])

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        revealed ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        className
      )}
    >
      {children}
    </div>
  )
}
