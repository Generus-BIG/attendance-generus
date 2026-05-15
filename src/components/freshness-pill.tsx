import { useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
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

export function FreshnessPill({ updatedAt, refreshIntervalMs = 30_000 }: Props) {
  const [, force] = useState(0)

  useEffect(() => {
    if (!updatedAt) return
    const id = setInterval(() => force((n) => n + 1), refreshIntervalMs)
    return () => clearInterval(id)
  }, [updatedAt, refreshIntervalMs])

  if (!updatedAt) return null
  const date = new Date(updatedAt)
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='text-muted-foreground inline-flex items-center gap-1.5 text-xs'>
            <span
              className='h-1.5 w-1.5 rounded-full bg-success'
              aria-hidden='true'
            />
            Diperbarui{' '}
            {formatDistanceToNow(date, {
              addSuffix: true,
              locale: idLocale,
            })}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {format(date, "EEEE, dd MMM yyyy 'pukul' HH:mm:ss", {
            locale: idLocale,
          })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
