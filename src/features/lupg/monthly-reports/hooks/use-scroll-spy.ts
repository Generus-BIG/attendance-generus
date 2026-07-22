import { useEffect, useRef, useState } from 'react'

type Options = {
  sectionIds: string[]
}

/**
 * Tracks the last section whose top has crossed the viewport reading line.
 * This stays deterministic when adjacent sections are both very tall.
 */
export function useScrollSpy({ sectionIds }: Options): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)
  const activeRef = useRef<string | null>(activeId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sectionIds.length === 0) return

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null)

    if (elements.length === 0) return

    let animationFrame: number | null = null

    const updateActiveSection = () => {
      animationFrame = null
      const readingLine = window.innerHeight * 0.45
      let nextId = elements[0]?.id ?? null

      for (const element of elements) {
        if (element.getBoundingClientRect().top > readingLine) break
        nextId = element.id
      }

      const reachedPageEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 1
      if (reachedPageEnd) nextId = elements.at(-1)?.id ?? nextId

      if (nextId !== activeRef.current) {
        activeRef.current = nextId
        setActiveId(nextId)
      }
    }

    const scheduleUpdate = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    }
  }, [sectionIds])

  return activeId
}
