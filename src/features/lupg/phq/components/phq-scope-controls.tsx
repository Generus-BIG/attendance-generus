import { useAuthStore } from '@/stores/auth-store'
import { type Role } from '@/lib/rbac'
import { KelompokSelector } from '../../components/kelompok-selector'
import { MonthPicker } from '../../components/month-picker'

interface Props {
  monthKey?: string
  onMonthChange?: (monthKey: string) => void
  kelompokId: string | undefined
  onKelompokChange: (kelompokId: string) => void
  allowAll?: boolean
}

export function PhqScopeControls({
  monthKey,
  onMonthChange,
  kelompokId,
  onKelompokChange,
  allowAll,
}: Props) {
  const { role } = useAuthStore((s) => s.auth)
  const isMt = (role as Role) === 'mt'

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {monthKey && onMonthChange ? (
        <MonthPicker monthKey={monthKey} onChange={onMonthChange} />
      ) : null}
      {!isMt ? (
        <KelompokSelector
          value={kelompokId}
          onChange={onKelompokChange}
          allOption={
            allowAll ? { value: 'all', label: 'Semua kelompok' } : undefined
          }
        />
      ) : null}
    </div>
  )
}
