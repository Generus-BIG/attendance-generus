import { cn } from '@/lib/utils'
import { useScrollSpy } from '../hooks/use-scroll-spy'

export type SectionItem = {
  id: string
  label: string
}

type Props = {
  sections: SectionItem[]
}

/**
 * Sticky section navigation. On lg+, renders a left-rail column. On smaller
 * viewports, renders a horizontal scroll strip pinned under the page header.
 */
export function SectionNav({ sections }: Props) {
  const activeId = useScrollSpy({ sectionIds: sections.map((s) => s.id) })

  const handleClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                    'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-muted font-semibold text-foreground'
                      : 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isActive && (
                    <span
                      aria-hidden='true'
                      className='bg-foreground absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full'
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
      <nav
        aria-label='Navigasi seksi laporan'
        className='border-border/60 bg-background/95 sticky top-16 z-20 -mx-4 flex gap-1 overflow-x-auto border-b px-4 py-2 backdrop-blur lg:hidden'
      >
        {sections.map((s) => {
          const isActive = activeId === s.id
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={handleClick(s.id)}
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
    </>
  )
}
