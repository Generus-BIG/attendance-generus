import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Presentation as PresentationIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { type Role } from '@/lib/rbac'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MonthPicker } from '../components/month-picker'
import { KelompokSelector } from '../components/kelompok-selector'
import { currentMonthKey } from '../utils/month-utils'

export function PresentationPicker() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.auth.role)
  const kelompokName = useAuthStore((s) => s.auth.kelompok)
  const typedRole = role as Role
  const isTeamManager = typedRole === 'team_manager'

  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [adminKelompokId, setAdminKelompokId] = useState<string | undefined>()

  const { data: kelompokOptions = [] } = useQuery({
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

  const tmKelompokId = useMemo(
    () => kelompokOptions.find((o) => o.value === kelompokName)?.id,
    [kelompokOptions, kelompokName]
  )

  const effectiveKelompokId = isTeamManager ? tmKelompokId : adminKelompokId

  const launch = () => {
    navigate({
      to: '/admin/lupg/recap/present',
      search: {
        month: monthKey,
        ...(effectiveKelompokId ? { kelompok: effectiveKelompokId } : {}),
      },
    })
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Presentation Mode
          </h2>
          <p className='text-muted-foreground'>
            Pilih bulan {isTeamManager ? '' : 'dan kelompok '}lalu jalankan
            presentasi dalam fullscreen.
          </p>
        </div>

        <Card className='max-w-xl'>
          <CardHeader>
            <CardTitle>Konfigurasi Presentasi</CardTitle>
            <CardDescription>
              {isTeamManager
                ? `Laporan otomatis difilter ke kelompok ${kelompokName}.`
                : 'Pilih satu kelompok untuk presentasi per-kelompok, atau kosongkan untuk tampilan desa (semua kelompok).'}
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <div className='flex flex-col gap-1.5'>
              <Label>Bulan</Label>
              <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
            </div>
            {!isTeamManager && (
              <div className='flex flex-col gap-1.5'>
                <Label>Kelompok (opsional)</Label>
                <KelompokSelector
                  value={adminKelompokId}
                  onChange={setAdminKelompokId}
                />
                <p className='text-muted-foreground text-xs'>
                  Kosongkan untuk tampilan desa (semua kelompok sekaligus).
                </p>
              </div>
            )}
            <Button
              onClick={launch}
              disabled={isTeamManager && !tmKelompokId}
              size='lg'
              className='mt-2 self-start'
            >
              <PresentationIcon className='mr-2 h-4 w-4' />
              Start Presentation
            </Button>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
