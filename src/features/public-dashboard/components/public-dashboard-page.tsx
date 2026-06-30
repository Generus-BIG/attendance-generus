import { useMemo } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { Route } from '@/routes/share/dashboard/$token'
import { id as idLocale } from 'date-fns/locale'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Kbd } from '@/components/ui/kbd'
import { FreshnessPill } from '@/components/freshness-pill'
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton'
import { MonthlyFormDashboard } from '@/features/dashboard/components/monthly-form-dashboard'
import { usePublicDashboardPayload } from '../hooks'

interface PublicDashboardPageProps {
  token: string
  monthKey: string
}

export function PublicDashboardPage({
  token,
  monthKey,
}: PublicDashboardPageProps) {
  const navigate = Route.useNavigate()
  const monthDate = useMemo(() => parseISO(`${monthKey}-01`), [monthKey])
  const prevMonthDate = useMemo(() => subMonths(monthDate, 1), [monthDate])
  const { data, isLoading, error, dataUpdatedAt } = usePublicDashboardPayload(
    token,
    monthKey
  )

  const setMonth = (newMonth: Date) => {
    navigate({
      search: {
        month: format(newMonth, 'yyyy-MM'),
      },
    })
  }

  const prevMonth = () => setMonth(subMonths(monthDate, 1))
  const nextMonth = () => setMonth(addMonths(monthDate, 1))

  if (isLoading) {
    return (
      <main className='min-h-screen bg-background px-4 py-6 sm:px-8'>
        <DashboardSkeleton viewMode='desa' />
      </main>
    )
  }

  if (error || !data || data.status === 'unavailable') {
    return (
      <main className='flex min-h-screen items-center justify-center bg-background px-4'>
        <Card className='max-w-md'>
          <CardContent className='flex flex-col items-center gap-3 py-10 text-center'>
            <AlertCircle className='h-10 w-10 text-muted-foreground' />
            <h1 className='text-xl font-semibold'>Dashboard tidak tersedia</h1>
            <p className='text-sm text-muted-foreground'>
              Link ini tidak aktif atau tidak ditemukan.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className='min-h-screen bg-background px-4 py-6 sm:px-8 print:px-0'>
      <div className='mx-auto flex max-w-7xl flex-col gap-5'>
        <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <span className='text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase'>
              Dashboard Absensi
            </span>
            <h1 className='text-3xl font-semibold tracking-tight'>
              {format(monthDate, 'MMMM yyyy', { locale: idLocale })}
            </h1>
            <p className='text-sm text-muted-foreground'>{data.share.name}</p>
          </div>

          <div className='flex flex-wrap items-center gap-2 print:hidden'>
            <span
              className='hidden items-center gap-1 text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase md:inline-flex'
              aria-hidden='true'
            >
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
              <span className='ms-1'>Switch month</span>
            </span>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                className='h-11 w-11'
                onClick={prevMonth}
                aria-label='Bulan sebelumnya'
                aria-keyshortcuts='ArrowLeft'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <div
                className='flex min-w-40 items-center justify-center gap-1.5 px-3 text-sm font-medium'
                aria-live='polite'
              >
                <CalendarDays className='h-4 w-4 text-muted-foreground' />
                {format(monthDate, 'MMMM yyyy', { locale: idLocale })}
              </div>
              <Button
                variant='outline'
                size='icon'
                className='h-11 w-11'
                onClick={nextMonth}
                aria-label='Bulan berikutnya'
                aria-keyshortcuts='ArrowRight'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
            <FreshnessPill updatedAt={dataUpdatedAt} />
          </div>
        </header>

        <MonthlyFormDashboard
          formIds={data.forms.map((form) => form.id)}
          month={monthDate}
          prevMonth={prevMonthDate}
          viewMode='desa'
          q={undefined}
          fGroup={undefined}
          fCategory={undefined}
          onQChange={() => undefined}
          onFGroupChange={() => undefined}
          onFCategoryChange={() => undefined}
          role='member'
          visibleSections={data.share.visibleSections}
          readOnly
          providedRecap={data.recap}
        />
      </div>
    </main>
  )
}
