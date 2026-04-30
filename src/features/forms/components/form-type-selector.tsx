import { Building2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type FormTypeEnum } from '@/lib/schema'

interface FormTypeSelectorProps {
  value: FormTypeEnum
  onChange: (value: FormTypeEnum) => void
  disabled?: boolean
}

const OPTIONS: {
  value: FormTypeEnum
  label: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: 'desa',
    label: 'Desa',
    description: 'Event bersama semua kelompok',
    Icon: Building2,
  },
  {
    value: 'kelompok',
    label: 'Kelompok',
    description: 'Pengajian rutin per kelompok',
    Icon: Users,
  },
]

export function FormTypeSelector({
  value,
  onChange,
  disabled,
}: FormTypeSelectorProps) {
  return (
    <div className='grid grid-cols-2 gap-3'>
      {OPTIONS.map(({ value: optValue, label, description, Icon }) => {
        const isSelected = value === optValue
        return (
          <button
            key={optValue}
            type='button'
            disabled={disabled}
            onClick={() => onChange(optValue)}
            className={cn(
              'flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-muted-foreground/30',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'text-sm font-medium leading-none',
                isSelected ? 'text-primary' : 'text-foreground'
              )}
            >
              {label}
            </span>
            <span className='text-xs text-muted-foreground'>{description}</span>
          </button>
        )
      })}
    </div>
  )
}
