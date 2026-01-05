import * as React from 'react'
import { addMonths, format, setMonth, setYear, subMonths } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface MonthNavigatorProps {
  date: Date
  onDateChange: (date: Date) => void
}

export function MonthNavigator({ date, onDateChange }: MonthNavigatorProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [yearView, setYearView] = React.useState(date.getFullYear())

  // Reset year view when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setYearView(date.getFullYear())
    }
  }, [isOpen, date])

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ]

  const handlePreviousMonth = () => onDateChange(subMonths(date, 1))
  const handleNextMonth = () => onDateChange(addMonths(date, 1))

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(date, yearView), monthIndex)
    onDateChange(newDate)
    setIsOpen(false)
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[160px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, 'MMMM yyyy', { locale: idLocale })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3" align="start">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setYearView(y => y - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold">{yearView}</span>
                <Button variant="ghost" size="icon" onClick={() => setYearView(y => y + 1)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
                {months.map((month, index) => {
                    const isSelected = date.getMonth() === index && date.getFullYear() === yearView
                    return (
                        <Button
                            key={month}
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handleMonthSelect(index)}
                            className={cn("text-xs", isSelected && "bg-primary text-primary-foreground")}
                        >
                            {month}
                        </Button>
                    )
                })}
            </div>
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="icon" onClick={handleNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
