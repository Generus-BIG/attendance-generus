import { cn } from '@/lib/utils'

interface Props {
  kicker: string
  title?: string
  description?: string
  status?: 'empty' | 'partial' | 'complete'
  action?: React.ReactNode
}

export function SectionHeading({
  kicker,
  title,
  description,
  status,
  action,
}: Props) {
  return (
    <div className='flex flex-col items-start justify-between gap-3 sm:flex-row'>
      <div className='flex min-w-0 flex-col gap-1'>
        <div className='flex items-center gap-2'>
          <span className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
            {kicker}
          </span>
          {status && <StatusDot status={status} />}
        </div>
        <h3 className='text-lg font-semibold tracking-tight'>
          {title ?? kicker}
        </h3>
        {description && (
          <p className='max-w-prose text-sm text-muted-foreground'>
            {description}
          </p>
        )}
      </div>
      {action && <div className='w-full shrink-0 sm:w-auto'>{action}</div>}
    </div>
  )
}

function StatusDot({ status }: { status: 'empty' | 'partial' | 'complete' }) {
  const label =
    status === 'complete'
      ? 'Selesai'
      : status === 'partial'
        ? 'Sebagian terisi'
        : 'Belum diisi'
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'complete' && 'bg-emerald-500',
        status === 'partial' && 'bg-amber-400',
        status === 'empty' && 'bg-muted-foreground/40'
      )}
      role='status'
      aria-label={label}
      title={label}
    />
  )
}
