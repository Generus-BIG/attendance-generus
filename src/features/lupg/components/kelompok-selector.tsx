import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

interface Props {
  value: string | undefined
  onChange: (kelompokId: string) => void
  placeholder?: string
}

export function KelompokSelector({ value, onChange, placeholder }: Props) {
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
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder={placeholder ?? 'Pilih kelompok'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
