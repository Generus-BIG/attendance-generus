import { useMemo, useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Route } from '@/routes/admin/lupg/reports/index'
import {
  useEnsureMonthlyReport,
  useMonthlyReportsWithSubmitter,
} from '../hooks/use-lupg-queries'
import { KelompokSelector } from '../components/kelompok-selector'
import { ReportCard } from '../components/report-card'
import { ReportMonthTabs } from '../components/report-month-tabs'
import {
  currentMonthKey,
  firstDayOfMonth,
  formatMonthLabel,
  monthKeyFromDate,
} from '../utils/month-utils'

export function MonthlyReportsList() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { month: searchMonth } = Route.useSearch()
  const activeMonth = searchMonth ?? currentMonthKey()

  const { role, kelompok } = useAuthStore((s) => s.auth)
  const isTeamManager = role === 'team_manager'

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

  const availableMonths = useMemo(() => reports.map((r) => r.month), [reports])

  const activeReport = useMemo(() => {
    if (!resolvedKelompokId) return undefined
    return reports.find((r) => r.month === firstDayOfMonth(activeMonth))
  }, [reports, resolvedKelompokId, activeMonth])

  const handleMonthChange = (monthKey: string) => {
    navigate({
      search: monthKey === currentMonthKey() ? {} : { month: monthKey },
    })
  }

  const handleOpenMonth = () => {
    if (!resolvedKelompokId) {
      toast.error('Pilih kelompok dulu')
      return
    }
    ensure.mutate(
      { kelompokId: resolvedKelompokId, month: activeMonth },
      {
        onSuccess: (r) => {
          navigate({
            to: '/admin/lupg/reports/$monthlyReportId',
            params: { monthlyReportId: r.id },
          })
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Gagal membuka laporan'
          toast.error(msg)
        },
      }
    )
  }

  const openDisabledReason = !resolvedKelompokId
    ? 'Pilih kelompok dulu untuk mengaktifkan tombol'
    : null

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
        <div className='flex flex-col gap-1'>
          <span className='text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-[0.14em]'>
            LUPG
          </span>
          <h2 className='text-foreground text-3xl font-semibold tracking-tight sm:text-[2rem]'>
            Laporan Bulanan
          </h2>
          <p className='text-muted-foreground text-sm'>
            {isTeamManager
              ? 'Laporan bulanan untuk kelompok Anda.'
              : 'Laporan bulanan per kelompok.'}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {!isTeamManager && (
            <KelompokSelector
              value={adminKelompokId}
              onChange={setAdminKelompokId}
            />
          )}
          <div className='flex-1' />
          <Button
            onClick={handleOpenMonth}
            disabled={!resolvedKelompokId || ensure.isPending}
            aria-describedby={openDisabledReason ? 'open-month-hint' : undefined}
          >
            {ensure.isPending ? (
              <Loader2
                className='mr-2 h-4 w-4 animate-spin motion-reduce:animate-none'
                aria-hidden='true'
              />
            ) : (
              <Plus className='mr-2 h-4 w-4' aria-hidden='true' />
            )}
            <span className='hidden sm:inline'>
              Buka Laporan {formatMonthLabel(activeMonth)}
            </span>
            <span className='sm:hidden'>Buka Laporan</span>
          </Button>
          {openDisabledReason && (
            <span id='open-month-hint' className='sr-only'>
              {openDisabledReason}
            </span>
          )}
        </div>

        {resolvedKelompokId && (
          <ReportMonthTabs
            availableMonths={availableMonths}
            value={activeMonth}
            onChange={handleMonthChange}
          />
        )}

        {!resolvedKelompokId ? (
          <div
            className='border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center'
            role='status'
            aria-live='polite'
          >
            Pilih kelompok untuk melihat laporan.
          </div>
        ) : isLoading ? (
          <div
            className='text-muted-foreground flex items-center justify-center py-16'
            role='status'
            aria-live='polite'
          >
            <Loader2
              className='mr-2 h-5 w-5 animate-spin motion-reduce:animate-none'
              aria-hidden='true'
            />
            Memuat laporan...
          </div>
        ) : activeReport ? (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            <ReportCard
              kelompokName={
                kelompokById.get(activeReport.kelompok_id) ??
                'Kelompok tidak dikenali'
              }
              monthKey={monthKeyFromDate(activeReport.month)}
              report={{
                id: activeReport.id,
                status: activeReport.status as 'draft' | 'submitted',
                locked: activeReport.locked,
                month: activeReport.month,
                submitter_display_name: activeReport.submitter_display_name,
                submitted_at: activeReport.submitted_at,
                created_at: activeReport.created_at,
              }}
            />
          </div>
        ) : (
          <div
            className='border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center'
            role='status'
            aria-live='polite'
          >
            <p className='text-muted-foreground text-sm'>
              Belum ada laporan untuk {formatMonthLabel(activeMonth)}.
            </p>
            <Button onClick={handleOpenMonth} disabled={ensure.isPending}>
              {ensure.isPending ? (
                <Loader2
                  className='mr-2 h-4 w-4 animate-spin motion-reduce:animate-none'
                  aria-hidden='true'
                />
              ) : (
                <Plus className='mr-2 h-4 w-4' aria-hidden='true' />
              )}
              Buka Laporan {formatMonthLabel(activeMonth)}
            </Button>
          </div>
        )}
      </Main>
    </>
  )
}
