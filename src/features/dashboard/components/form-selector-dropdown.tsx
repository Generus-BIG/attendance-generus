import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface DashboardFormItem {
  id: string
  title: string
  date: string
  isActive: boolean
}

interface FormSelectorDropdownProps {
  forms: DashboardFormItem[]
  selectedFormId: string | undefined
  onSelect: (formId: string | undefined) => void
}

export function FormSelectorDropdown({
  forms,
  selectedFormId,
  onSelect,
}: FormSelectorDropdownProps) {
  return (
    <Select
      value={selectedFormId ?? '__all__'}
      onValueChange={(v) => onSelect(v === '__all__' ? undefined : v)}
    >
      <SelectTrigger className='w-70'>
        <SelectValue placeholder='Pilih form...' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='__all__'>Semua Form Desa</SelectItem>
        {forms.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            <span className='flex items-center gap-2'>
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  f.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                )}
              />
              {f.title}
              <span className='text-muted-foreground'>
                {format(parseISO(f.date), 'dd MMM', { locale: idLocale })}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
