import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonthLabel, shiftMonth } from '../utils/month-utils'

interface Props {
  monthKey: string
  onChange: (monthKey: string) => void
  maxMonthKey?: string
}

export function MonthPicker({ monthKey, onChange, maxMonthKey }: Props) {
  return (
    <div className='flex items-center gap-1'>
      <Button
        variant='outline'
        size='icon'
        className='size-11'
        onClick={() => onChange(shiftMonth(monthKey, -1))}
        aria-label='Bulan sebelumnya'
      >
        <ChevronLeft className='h-4 w-4' />
      </Button>
      <div
        className='flex min-w-40 items-center justify-center gap-1.5 px-3 text-sm font-medium'
        aria-live='polite'
      >
        <CalendarDays className='h-4 w-4 text-muted-foreground' />
        {formatMonthLabel(monthKey)}
      </div>
      <Button
        variant='outline'
        size='icon'
        className='size-11'
        onClick={() => onChange(shiftMonth(monthKey, 1))}
        disabled={maxMonthKey !== undefined && monthKey >= maxMonthKey}
        aria-label='Bulan berikutnya'
      >
        <ChevronRight className='h-4 w-4' />
      </Button>
    </div>
  )
}
