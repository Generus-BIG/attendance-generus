import { useEffect, useRef } from 'react'

type Handlers = {
  onPrevMonth?: () => void
  onNextMonth?: () => void
  onJumpToToday?: () => void
  onExport?: () => void
}

/**
 * Attaches keyboard shortcuts to the window:
 *  - ArrowLeft  → onPrevMonth
 *  - ArrowRight → onNextMonth
 *  - T          → onJumpToToday
 *  - E          → onExport
 *
 * Ignored when focus is in a form element or when a modifier key is held.
 *
 * Handlers are read via a ref so the keydown listener stays attached for the
 * component lifetime rather than re-subscribing on every render.
 */
export function useDashboardShortcuts(handlers: Handlers) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (target.isContentEditable) return
      }
      const h = handlersRef.current
      switch (e.key) {
        case 'ArrowLeft':
          if (h.onPrevMonth) {
            e.preventDefault()
            h.onPrevMonth()
          }
          break
        case 'ArrowRight':
          if (h.onNextMonth) {
            e.preventDefault()
            h.onNextMonth()
          }
          break
        case 't':
        case 'T':
          if (h.onJumpToToday) {
            e.preventDefault()
            h.onJumpToToday()
          }
          break
        case 'e':
        case 'E':
          if (h.onExport) {
            e.preventDefault()
            h.onExport()
          }
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
