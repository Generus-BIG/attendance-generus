import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface KelompokOption {
  id: string
  value: string
}

interface KelompokPillsProps {
  options: KelompokOption[]
  selectedId: string | undefined
  onSelect: (id: string) => void
}

export function KelompokPills({
  options,
  selectedId,
  onSelect,
}: KelompokPillsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (idx + 1) % options.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (idx - 1 + options.length) % options.length
    } else if (e.key === 'Home') {
      next = 0
    } else if (e.key === 'End') {
      next = options.length - 1
    } else {
      return
    }
    e.preventDefault()
    onSelect(options[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div role='radiogroup' aria-label='Pilih kelompok' className='flex gap-2'>
      {options.map((k, idx) => {
        const selected = k.id === selectedId
        return (
          <button
            key={k.id}
            ref={(el) => {
              refs.current[idx] = el
            }}
            type='button'
            role='radio'
            aria-checked={selected}
            tabIndex={
              selected || (selectedId === undefined && idx === 0) ? 0 : -1
            }
            onClick={() => onSelect(k.id)}
            onKeyDown={(e) => handleKey(e, idx)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              selected
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {k.value}
          </button>
        )
      })}
    </div>
  )
}
