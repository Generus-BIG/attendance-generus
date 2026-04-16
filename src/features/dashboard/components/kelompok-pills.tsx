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
  return (
    <div role='radiogroup' aria-label='Pilih kelompok' className='flex gap-2'>
      {options.map((k) => {
        const selected = k.id === selectedId
        return (
          <button
            key={k.id}
            type='button'
            role='radio'
            aria-checked={selected}
            onClick={() => onSelect(k.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {k.value}
          </button>
        )
      })}
    </div>
  )
}
