import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Props = {
  updatedAt: number | undefined
  refreshIntervalMs?: number
}

function formatRelative(from: Date, now: Date): string {
  const diffSec = Math.max(
    0,
    Math.floor((now.getTime() - from.getTime()) / 1000)
  )
  if (diffSec < 45) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

export function FreshnessPill({
  updatedAt,
  refreshIntervalMs = 30_000,
}: Props) {
  const [, force] = useState(0)

  useEffect(() => {
    if (!updatedAt) return
    const id = setInterval(() => force((n) => n + 1), refreshIntervalMs)
    return () => clearInterval(id)
  }, [updatedAt, refreshIntervalMs])

  if (!updatedAt) return null
  const date = new Date(updatedAt)
  const label = formatRelative(date, new Date())
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span
              className='h-1.5 w-1.5 rounded-full bg-success'
              aria-hidden='true'
            />
            {label === 'just now' ? 'Updated just now' : `Updated ${label}`}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {format(date, 'EEE, dd MMM yyyy HH:mm:ss')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
