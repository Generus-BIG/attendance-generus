import { cn } from '@/lib/utils'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  DERIVED_SENSUS_CATEGORIES,
} from '../../constants'
import { SensusStepperInput } from './sensus-stepper-input'

interface DerivedMap {
  get: (key: string) => number | undefined
}

interface Props {
  kelompokId: string | undefined
  byCell: Record<string, number>
  derivedByKey: DerivedMap
  readOnly?: boolean
}

export function SensusCardList({
  kelompokId,
  byCell,
  derivedByKey,
  readOnly = false,
}: Props) {
  return (
    <div className='flex flex-col gap-3'>
      {CATEGORY_CODES.map((code) => {
        const isDerived = DERIVED_SENSUS_CATEGORIES.has(code)
        const isReadOnly = readOnly || isDerived || !kelompokId
        const l = isDerived
          ? (derivedByKey.get(`${code}__L`) ?? 0)
          : (byCell[`${code}_L`] ?? 0)
        const p = isDerived
          ? (derivedByKey.get(`${code}__P`) ?? 0)
          : (byCell[`${code}_P`] ?? 0)
        return (
          <div
            key={code}
            className={cn(
              'rounded-md border p-4',
              isDerived ? 'bg-muted/40' : 'bg-background'
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='flex flex-col gap-0.5'>
                <div className='text-sm leading-tight font-semibold'>
                  {CATEGORY_LABELS[code]}
                </div>
                {isDerived && (
                  <span className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
                    Auto Fetched
                  </span>
                )}
              </div>
              <div className='text-right tabular-nums'>
                <div className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
                  Total
                </div>
                <div className='text-lg font-semibold'>{l + p}</div>
              </div>
            </div>
            {!isReadOnly ? (
              <div className='mt-4 grid grid-cols-2 gap-3'>
                <label className='flex flex-col gap-1.5'>
                  <span className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                    Laki-laki
                  </span>
                  <SensusStepperInput
                    kelompokId={kelompokId}
                    categoryCode={code}
                    gender='L'
                    initial={l}
                  />
                </label>
                <label className='flex flex-col gap-1.5'>
                  <span className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                    Perempuan
                  </span>
                  <SensusStepperInput
                    kelompokId={kelompokId}
                    categoryCode={code}
                    gender='P'
                    initial={p}
                  />
                </label>
              </div>
            ) : (
              <div className='mt-3 grid grid-cols-2 gap-3 text-sm tabular-nums'>
                <div>
                  <span className='text-muted-foreground'>L · </span>
                  <span className='font-semibold'>{l}</span>
                </div>
                <div>
                  <span className='text-muted-foreground'>P · </span>
                  <span className='font-semibold'>{p}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
