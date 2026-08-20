import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  year: number
  onChange: (year: number) => void
  minYear?: number
  maxYear?: number
}

export function YearPicker({ year, onChange, minYear = 2024, maxYear }: Props) {
  const effectiveMax = maxYear ?? new Date().getFullYear()
  return (
    <div className='flex items-center gap-1'>
      <Button
        variant='outline'
        size='icon'
        className='h-8 w-8'
        onClick={() => onChange(year - 1)}
        disabled={year <= minYear}
        aria-label='Tahun sebelumnya'
      >
        <ChevronLeft className='h-4 w-4' />
      </Button>
      <div className='flex min-w-28 items-center justify-center gap-1.5 px-3 text-sm font-medium'>
        <CalendarClock className='h-4 w-4 text-muted-foreground' />
        {year}
      </div>
      <Button
        variant='outline'
        size='icon'
        className='h-8 w-8'
        onClick={() => onChange(year + 1)}
        disabled={year >= effectiveMax}
        aria-label='Tahun berikutnya'
      >
        <ChevronRight className='h-4 w-4' />
      </Button>
    </div>
  )
}
