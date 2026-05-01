import { CheckCircle2, CircleDashed, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  status: 'draft' | 'submitted'
  locked?: boolean
}

export function ReportStatusBadge({ status, locked }: Props) {
  const isDone = status === 'submitted'
  const label = isDone ? 'Selesai' : 'Belum Selesai'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isDone
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
      )}
    >
      {isDone ? (
        <CheckCircle2 className='h-3 w-3' />
      ) : (
        <CircleDashed className='h-3 w-3' />
      )}
      {label}
      {locked ? <Lock className='ml-0.5 h-3 w-3' aria-label='Terkunci' /> : null}
    </span>
  )
}
