import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  value: string | undefined
  onChange: (kelompokId: string) => void
  placeholder?: string
  allOption?: {
    value: string
    label: string
  }
  className?: string
}

export function KelompokSelector({
  value,
  onChange,
  placeholder,
  allOption,
  className,
}: Props) {
  const { data: options = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return data as { id: string; value: string }[]
    },
  })

  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className={cn('w-[180px]', className)}>
        <SelectValue placeholder={placeholder ?? 'Pilih kelompok'} />
      </SelectTrigger>
      <SelectContent>
        {allOption ? (
          <SelectItem value={allOption.value}>{allOption.label}</SelectItem>
        ) : null}
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
