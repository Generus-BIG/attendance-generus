import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  useMonthlyReportsWithSubmitter,
  useEnsureMonthlyReport,
} from '../hooks/use-lupg-queries'
import {
  currentMonthKey,
  formatMonthLabel,
  monthKeyFromDate,
} from '../utils/month-utils'
import { ReportStatusBadge } from '../components/report-status-badge'
import { KelompokSelector } from '../components/kelompok-selector'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function MonthlyReportsList() {
  const { role, kelompok } = useAuthStore((s) => s.auth)
  const isTeamManager = role === 'team_manager'

  // Resolve kelompokId: team_manager from auth; admin/super_admin selects.
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

  const [adminKelompokId, setAdminKelompokId] = useState<string | undefined>()
  const resolvedKelompokId: string | undefined = isTeamManager
    ? kelompokOptions.find((o) => o.value === kelompok)?.id
    : adminKelompokId

  const kelompokById = useMemo(() => {
    const m = new Map<string, string>()
    for (const k of kelompokOptions) m.set(k.id, k.value)
    return m
  }, [kelompokOptions])

  const { data: reports = [], isLoading } = useMonthlyReportsWithSubmitter({
    kelompokId: resolvedKelompokId,
  })

  const ensure = useEnsureMonthlyReport()

  const handleOpenCurrentMonth = () => {
    if (!resolvedKelompokId) {
      toast.error('Pilih kelompok dulu')
      return
    }
    ensure.mutate(
      { kelompokId: resolvedKelompokId, month: currentMonthKey() },
      {
        onSuccess: (r) => {
          window.location.href = `/admin/lupg/reports/${r.id}`
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Gagal membuka laporan'
          toast.error(msg)
        },
      }
    )
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
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Laporan Bulanan
            </h2>
            <p className='text-muted-foreground'>
              {isTeamManager
                ? 'Laporan bulanan untuk kelompok Anda.'
                : 'Semua laporan bulanan per kelompok.'}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {!isTeamManager && (
              <KelompokSelector
                value={adminKelompokId}
                onChange={setAdminKelompokId}
              />
            )}
            <Button
              onClick={handleOpenCurrentMonth}
              disabled={!resolvedKelompokId || ensure.isPending}
            >
              {ensure.isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Plus className='mr-2 h-4 w-4' />
              )}
              Buka Bulan {formatMonthLabel(currentMonthKey())}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-16 text-muted-foreground'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat laporan...
          </div>
        ) : reports.length === 0 ? (
          <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
            {resolvedKelompokId
              ? 'Belum ada laporan. Klik tombol di atas untuk mulai.'
              : 'Pilih kelompok untuk melihat laporan.'}
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {reports.map((r) => (
              <Card key={r.id} className='flex flex-col'>
                <CardHeader className='flex flex-row items-start justify-between gap-2 space-y-0'>
                  <div className='min-w-0'>
                    <CardTitle className='truncate text-xl'>
                      {kelompokById.get(r.kelompok_id) ??
                        'Kelompok tidak dikenali'}
                    </CardTitle>
                    <CardDescription>
                      {formatMonthLabel(monthKeyFromDate(r.month))}
                    </CardDescription>
                  </div>
                  <ReportStatusBadge
                    status={r.status as 'draft' | 'submitted'}
                    locked={r.locked}
                  />
                </CardHeader>
                <CardContent className='flex flex-1 flex-col gap-1 text-sm'>
                  {r.status === 'submitted' ? (
                    <>
                      <div>
                        <span className='text-muted-foreground'>Oleh: </span>
                        {r.submitter_display_name ?? '-'}
                      </div>
                      <div>
                        <span className='text-muted-foreground'>
                          Ditandai selesai:{' '}
                        </span>
                        {r.submitted_at
                          ? new Date(r.submitted_at).toLocaleDateString(
                              'id-ID'
                            )
                          : '-'}
                      </div>
                    </>
                  ) : (
                    <div className='text-muted-foreground'>
                      Belum disubmit
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Link
                    to='/admin/lupg/reports/$monthlyReportId'
                    params={{ monthlyReportId: r.id }}
                  >
                    <Button variant='outline' size='sm'>
                      Buka Laporan
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
