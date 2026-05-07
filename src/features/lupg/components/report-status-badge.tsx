import { CheckCircle2, CircleDashed, Lock } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface Props {
  status: 'draft' | 'submitted'
  locked?: boolean
  className?: string
}

export function ReportStatusBadge({ status, locked, className }: Props) {
  const isDone = status === 'submitted'
  const label = isDone ? 'Selesai' : 'Belum Selesai'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          isDone
            ? 'bg-success/15 text-success dark:bg-success/20'
            : 'bg-warning/20 text-warning-foreground dark:bg-warning/25 dark:text-warning'
        )}
      >
        {isDone ? (
          <CheckCircle2 className='h-3 w-3' aria-hidden='true' />
        ) : (
          <CircleDashed className='h-3 w-3' aria-hidden='true' />
        )}
        {label}
      </span>
      {locked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'>
              <Lock className='h-3 w-3' aria-hidden='true' />
              Terkunci
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Laporan ini terkunci. Hubungi admin untuk membuka kunci.
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  )
}
