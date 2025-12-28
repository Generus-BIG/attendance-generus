import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MonthlyFormRecap } from '../types'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
  limit?: number
}

export function FollowUpTable({ recap, isLoading, limit = 8 }: Props) {
  if (isLoading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='flex items-center gap-4'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <div className='flex-1 space-y-1'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-3 w-20' />
            </div>
            <Skeleton className='h-6 w-12' />
          </div>
        ))}
      </div>
    )
  }

  if (!recap?.participants.length) {
    return (
      <div className='flex h-32 items-center justify-center text-muted-foreground'>
        Belum ada data peserta bulan ini
      </div>
    )
  }

  // Already sorted by attendanceRate ascending (worst first)
  const worstParticipants = recap.participants.slice(0, limit)
  const totalMeetings = recap.totals.totalMeetings

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='grid grid-cols-12 text-xs font-medium text-muted-foreground'>
        <div className='col-span-6'>Peserta</div>
        <div className='col-span-3 text-center'>Kehadiran</div>
        <div className='col-span-3 text-right'>Rate</div>
      </div>

      {/* Rows */}
      <div className='space-y-3'>
        {worstParticipants.map((p) => {
          const rate = Math.round(p.attendanceRate * 100)
          const isLow = rate < 50
          const isCritical = rate < 25

          return (
            <div
              key={p.participantId}
              className='grid grid-cols-12 items-center gap-2 rounded-md border p-2'
            >
              <div className='col-span-6'>
                <div className='font-medium truncate'>{p.participantName}</div>
                {p.participantGroup && (
                  <div className='text-xs text-muted-foreground'>{p.participantGroup}</div>
                )}
              </div>
              <div className='col-span-3 text-center'>
                <span className='font-mono text-sm'>
                  {p.hadirCount}/{totalMeetings}
                </span>
              </div>
              <div className='col-span-3 text-right'>
                <Badge
                  variant={isCritical ? 'destructive' : isLow ? 'secondary' : 'outline'}
                  className={cn(
                    'font-mono',
                    !isCritical && !isLow && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  )}
                >
                  {rate}%
                </Badge>
              </div>
            </div>
          )
        })}
      </div>

      {recap.participants.length > limit && (
        <p className='text-center text-xs text-muted-foreground'>
          +{recap.participants.length - limit} peserta lainnya
        </p>
      )}
    </div>
  )
}
