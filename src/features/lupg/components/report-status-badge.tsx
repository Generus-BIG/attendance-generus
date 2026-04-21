import { cn } from '@/lib/utils'

interface Props {
  status: 'draft' | 'submitted'
  locked?: boolean
}

export function ReportStatusBadge({ status, locked }: Props) {
  const label =
    status === 'submitted' ? 'Submitted' : 'Draft'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'submitted'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
      )}
    >
      {status === 'submitted' && locked ? '🔒 ' : ''}
      {label}
    </span>
  )
}
