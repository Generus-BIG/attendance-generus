import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Presentation as PresentationIcon, Settings2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { type Role } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { KelompokSelector } from '../components/kelompok-selector'
import { MonthPicker } from '../components/month-picker'
import { PresentationShareCard } from './presentation-share-card'

const DESA_SELECTION = 'desa'

interface PresentationPickerProps {
  initialMonthKey: string
  initialKelompokId?: string
}

export function PresentationPicker({
  initialMonthKey,
  initialKelompokId,
}: PresentationPickerProps) {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.auth.role)
  const kelompokName = useAuthStore((s) => s.auth.kelompok)
  const typedRole = role as Role
  const isTeamManager = typedRole === 'team_manager'

  const [monthKey, setMonthKey] = useState(initialMonthKey)
  const [adminKelompokId, setAdminKelompokId] = useState(initialKelompokId)

  const {
    data: kelompokOptions = [],
    isError: kelompokError,
    isLoading: kelompokLoading,
    refetch: refetchKelompok,
  } = useQuery({
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
  const selectedKelompok = kelompokOptions.find(
    (option) => option.id === effectiveKelompokId
  )
  const scopeLabel =
    selectedKelompok?.value ??
    (isTeamManager ? kelompokName || 'Kelompok Anda' : 'Desa Big')
  const kelompokReady = !kelompokLoading && !kelompokError
  const sharingEnabled =
    kelompokReady && (!isTeamManager || Boolean(tmKelompokId))

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
          <h2 className='text-2xl font-bold tracking-tight text-balance'>
            Presentasi
          </h2>
          <p className='text-pretty text-muted-foreground'>
            Preview deck untuk ditampilkan langsung atau bagikan link publik
            dengan bulan dan cakupan yang sama.
          </p>
        </div>

        <div className='grid max-w-6xl items-stretch gap-6 lg:grid-cols-2'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-start gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40'>
                  <Settings2 className='size-5' />
                </div>
                <div className='min-w-0'>
                  <CardTitle className='text-balance'>
                    Konfigurasi Presentasi
                  </CardTitle>
                  <CardDescription className='mt-1 text-pretty'>
                    {isTeamManager
                      ? `Laporan otomatis difilter ke kelompok ${kelompokName}.`
                      : 'Pilih satu kelompok untuk deck per-kelompok, atau gunakan cakupan Desa.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className='flex flex-col gap-5'>
              <div className='flex flex-col gap-1.5'>
                <Label>Bulan</Label>
                <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
              </div>
              {!isTeamManager && (
                <div className='flex flex-col gap-1.5'>
                  <Label>Cakupan presentasi</Label>
                  <KelompokSelector
                    value={adminKelompokId ?? DESA_SELECTION}
                    onChange={(value) =>
                      setAdminKelompokId(
                        value === DESA_SELECTION ? undefined : value
                      )
                    }
                    allOption={{ value: DESA_SELECTION, label: 'Desa Big' }}
                  />
                  <p className='text-xs text-pretty text-muted-foreground'>
                    Pilih Desa untuk tampilan yang mencakup semua kelompok.
                  </p>
                </div>
              )}
              {kelompokError && (
                <div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground'>
                  Data kelompok gagal dimuat.
                  <Button
                    type='button'
                    variant='link'
                    size='sm'
                    className='h-auto p-0'
                    onClick={() => refetchKelompok()}
                  >
                    Coba lagi
                  </Button>
                </div>
              )}
              {isTeamManager && kelompokReady && !tmKelompokId && (
                <p className='text-sm text-muted-foreground'>
                  Kelompok Anda belum dapat ditentukan. Hubungi administrator.
                </p>
              )}
              <Button
                onClick={launch}
                disabled={!sharingEnabled}
                size='lg'
                className='mt-auto min-h-11 self-start'
              >
                <PresentationIcon className='mr-2 h-4 w-4' />
                Mulai Presentasi
              </Button>
            </CardContent>
          </Card>

          <PresentationShareCard
            monthKey={monthKey}
            kelompokId={effectiveKelompokId}
            scopeLabel={scopeLabel}
            enabled={sharingEnabled}
          />
        </div>
      </Main>
    </>
  )
}
