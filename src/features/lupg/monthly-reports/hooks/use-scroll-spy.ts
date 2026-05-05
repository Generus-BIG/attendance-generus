import { useEffect, useRef, useState } from 'react'

type Options = {
  sectionIds: string[]
  rootMargin?: string
  threshold?: number | number[]
}

/**
 * Tracks which of the given section elements is currently "in view". Returns
 * the id of the most-recently-intersecting element.
 */
export function useScrollSpy({
  sectionIds,
  rootMargin = '-45% 0px -45% 0px',
  threshold = 0,
}: Options): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)
  const activeRef = useRef<string | null>(activeId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sectionIds.length === 0) return

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id
            if (id !== activeRef.current) {
              activeRef.current = id
              setActiveId(id)
            }
            return
          }
        }
      },
      { rootMargin, threshold }
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [sectionIds, rootMargin, threshold])

  return activeId
}
