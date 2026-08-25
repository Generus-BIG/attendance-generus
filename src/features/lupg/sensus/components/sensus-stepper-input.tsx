import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DERIVED_SENSUS_CATEGORIES, type CategoryCode } from '../../constants'
import { useUpsertSensusCell } from '../../hooks/use-lupg-queries'
import { type SensusGender } from '../../types'

interface Props {
  kelompokId: string
  categoryCode: CategoryCode
  gender: SensusGender
  initial: number
  className?: string
}

/**
 * Touch-first numeric input with -/+ steppers. 44x44px touch targets.
 * Same blur-save semantics as the desktop SensusCell.
 */
export function SensusStepperInput({
  kelompokId,
  categoryCode,
  gender,
  initial,
  className,
}: Props) {
  const [value, setValue] = useState(() => initial.toString())
  const upsert = useUpsertSensusCell()

  useEffect(() => {
    setValue(initial.toString())
  }, [initial])

  const commit = (next: number) => {
    if (DERIVED_SENSUS_CATEGORIES.has(categoryCode)) return
    if (next < 0) return
    if (next === initial) return
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        category_code: categoryCode,
        gender,
        count: next,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
          setValue(initial.toString())
        },
      }
    )
  }

  const saveFromText = () => {
    const n = parseInt(value, 10)
    if (isNaN(n) || n < 0) {
      setValue(initial.toString())
      return
    }
    commit(n)
  }

  const bump = (delta: number) => {
    const n = parseInt(value, 10)
    const base = isNaN(n) ? initial : n
    const next = Math.max(0, base + delta)
    setValue(next.toString())
    commit(next)
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='h-11 w-11 shrink-0'
        onClick={() => bump(-1)}
        aria-label='Kurangi'
        disabled={parseInt(value, 10) <= 0}
      >
        <Minus className='h-4 w-4' />
      </Button>
      <Input
        type='number'
        inputMode='numeric'
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={saveFromText}
        className='h-11 min-w-0 flex-1 text-center text-base tabular-nums'
        aria-label={`Jumlah ${categoryCode} ${gender}`}
      />
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='h-11 w-11 shrink-0'
        onClick={() => bump(1)}
        aria-label='Tambah'
      >
        <Plus className='h-4 w-4' />
      </Button>
    </div>
  )
}
