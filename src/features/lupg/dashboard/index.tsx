import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useMonthlyReports } from '../hooks/use-lupg-queries'
import { ReportStatusBadge } from '../components/report-status-badge'
import {
  currentMonthKey,
  firstDayOfMonth,
  formatMonthLabel,
} from '../utils/month-utils'

export function LupgDashboard() {
  const currentMonth = currentMonthKey()

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
    fromMonth: currentMonth,
    toMonth: currentMonth,
  })

  const reportByKelompok = new Map(
    reports
      .filter((r) => r.month === firstDayOfMonth(currentMonth))
      .map((r) => [r.kelompok_id, r])
  )

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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Dashboard LUPG
          </h2>
          <p className='text-muted-foreground'>
            Status laporan bulan {formatMonthLabel(currentMonth)} per
            kelompok.
          </p>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-16 text-muted-foreground'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat status...
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {kelompokOptions.map((k) => {
              const r = reportByKelompok.get(k.id)
              return (
                <Card key={k.id}>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-base'>{k.value}</CardTitle>
                    {r ? (
                      <ReportStatusBadge
                        status={r.status as 'draft' | 'submitted'}
                        locked={r.locked}
                      />
                    ) : (
                      <span className='text-xs text-muted-foreground'>
                        Belum dibuka
                      </span>
                    )}
                  </CardHeader>
                  <CardContent className='flex items-center justify-between'>
                    <div className='text-sm text-muted-foreground'>
                      {r?.submitted_at
                        ? `Selesai ${new Date(r.submitted_at).toLocaleDateString('id-ID')}`
                        : r
                          ? 'Belum selesai'
                          : '-'}
                    </div>
                    {r && (
                      <Link
                        to='/admin/lupg/reports/$monthlyReportId'
                        params={{ monthlyReportId: r.id }}
                      >
                        <Button variant='outline' size='sm'>
                          Buka
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </Main>
    </>
  )
}
