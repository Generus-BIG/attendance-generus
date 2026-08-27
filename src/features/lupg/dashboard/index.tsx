import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/admin/lupg/dashboard'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { MonthPickerSelect } from '../components/month-picker-select'
import { ReportCard } from '../components/report-card'
import { SummaryStrip } from '../components/summary-strip'
import {
  useEnsureMonthlyReport,
  useMonthlyReports,
} from '../hooks/use-lupg-queries'
import {
  currentMonthKey,
  firstDayOfMonth,
  formatMonthLabel,
} from '../utils/month-utils'

export function LupgDashboard() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { month: searchMonth } = Route.useSearch()
  const activeMonth = searchMonth ?? currentMonthKey()

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

  const { data: reports = [], isLoading } = useMonthlyReports({
    fromMonth: activeMonth,
    toMonth: activeMonth,
  })

  const ensure = useEnsureMonthlyReport()

  const reportByKelompok = useMemo(() => {
    const m = new Map<string, (typeof reports)[number]>()
    for (const r of reports) {
      if (r.month === firstDayOfMonth(activeMonth)) {
        m.set(r.kelompok_id, r)
      }
    }
    return m
  }, [reports, activeMonth])

  const summary = useMemo(() => {
    let submitted = 0
    let draft = 0
    let notStarted = 0
    for (const k of kelompokOptions) {
      const r = reportByKelompok.get(k.id)
      if (!r) notStarted++
      else if (r.status === 'submitted') submitted++
      else draft++
    }
    return {
      total: kelompokOptions.length,
      submitted,
      draft,
      notStarted,
    }
  }, [kelompokOptions, reportByKelompok])

  const handleOpenNotStarted = (kelompokId: string) => {
    ensure.mutate(
      { kelompokId, month: activeMonth },
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

  const handleMonthChange = (monthKey: string) => {
    navigate({
      search: monthKey === currentMonthKey() ? {} : { month: monthKey },
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
        <div className='flex flex-col gap-1'>
          <h2 className='text-2xl font-bold tracking-tight'>Dashboard LUPG</h2>
          <p className='text-sm text-muted-foreground'>
            Status laporan per kelompok untuk {formatMonthLabel(activeMonth)}.
          </p>
        </div>

        <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <MonthPickerSelect
            value={activeMonth}
            onChange={handleMonthChange}
            className='w-[200px]'
          />
          {!isLoading && kelompokOptions.length > 0 && (
            <SummaryStrip
              total={summary.total}
              submitted={summary.submitted}
              draft={summary.draft}
              notStarted={summary.notStarted}
            />
          )}
        </div>

        {isLoading ? (
          <div
            className='flex items-center justify-center py-16 text-muted-foreground'
            role='status'
            aria-live='polite'
          >
            <Loader2
              className='mr-2 h-5 w-5 animate-spin motion-reduce:animate-none'
              aria-hidden='true'
            />
            Memuat status...
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {kelompokOptions.map((k) => {
              const r = reportByKelompok.get(k.id)
              return (
                <ReportCard
                  key={k.id}
                  kelompokName={k.value}
                  monthKey={activeMonth}
                  report={
                    r
                      ? {
                          id: r.id,
                          status: r.status as 'draft' | 'submitted',
                          locked: r.locked,
                          month: r.month,
                          submitted_at: r.submitted_at,
                          created_at: r.created_at,
                        }
                      : undefined
                  }
                  onOpenNotStarted={() => handleOpenNotStarted(k.id)}
                  disabled={ensure.isPending}
                />
              )
            })}
          </div>
        )}
      </Main>
    </>
  )
}
