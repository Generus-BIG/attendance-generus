import { cn } from '@/lib/utils'

interface Props {
  total: number
  submitted: number
  draft: number
  notStarted: number
  className?: string
}

export function SummaryStrip({
  total,
  submitted,
  draft,
  notStarted,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm',
        className
      )}
      aria-label='Ringkasan status laporan'
    >
      <span>
        <span className='text-foreground font-semibold'>{submitted}</span>
        <span>/</span>
        <span className='text-foreground font-semibold'>{total}</span>
        <span className='ml-1'>selesai</span>
      </span>
      <span aria-hidden='true'>·</span>
      <span>
        <span className='text-foreground font-semibold'>{draft}</span> draft
      </span>
      <span aria-hidden='true'>·</span>
      <span>
        <span className='text-foreground font-semibold'>{notStarted}</span>{' '}
        belum dibuka
      </span>
    </div>
  )
}
