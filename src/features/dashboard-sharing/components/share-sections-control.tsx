import { AlertTriangle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  PUBLIC_DASHBOARD_SECTION_LABELS,
  type PublicDashboardSectionKey,
  type PublicDashboardVisibleSections,
} from '../types'

const SECTION_KEYS = Object.keys(
  PUBLIC_DASHBOARD_SECTION_LABELS
) as PublicDashboardSectionKey[]

interface ShareSectionsControlProps {
  value: PublicDashboardVisibleSections
  onChange: (value: PublicDashboardVisibleSections) => void
}

export function ShareSectionsControl({
  value,
  onChange,
}: ShareSectionsControlProps) {
  return (
    <div className='space-y-3'>
      {SECTION_KEYS.map((key) => (
        <label
          key={key}
          className='flex items-center justify-between gap-4 rounded-md border px-3 py-2'
        >
          <span className='flex flex-col gap-0.5'>
            <span className='text-sm font-medium'>
              {PUBLIC_DASHBOARD_SECTION_LABELS[key]}
            </span>
            {key === 'followUp' && (
              <span className='flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400'>
                <AlertTriangle className='h-3.5 w-3.5' />
                Menampilkan nama peserta pada link publik.
              </span>
            )}
          </span>
          <Switch
            checked={value[key]}
            onCheckedChange={(checked) =>
              onChange({
                ...value,
                [key]: checked,
              })
            }
          />
        </label>
      ))}
    </div>
  )
}
