import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  currentMonthKey,
  formatMonthLabel,
  shiftMonth,
} from '../utils/month-utils'

interface Props {
  value: string
  onChange: (monthKey: string) => void
  monthsBack?: number
  className?: string
}

export function MonthPickerSelect({
  value,
  onChange,
  monthsBack = 12,
  className,
}: Props) {
  const now = currentMonthKey()
  const options = useMemo(() => {
    const list: { key: string; label: string }[] = []
    for (let i = 0; i < monthsBack; i++) {
      const key = shiftMonth(now, -i)
      list.push({ key, label: formatMonthLabel(key) })
    }
    if (!list.find((o) => o.key === value)) {
      list.push({ key: value, label: formatMonthLabel(value) })
    }
    return list
  }, [now, monthsBack, value])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label='Pilih bulan'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
            {o.key === now ? ' · Bulan ini' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
