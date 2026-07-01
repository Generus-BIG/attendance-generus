import { useEffect, useMemo } from 'react'
import { addMonths, format, parseISO, subMonths, type Locale } from 'date-fns'
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
import { FormSelectorDropdown } from '@/features/dashboard/components/form-selector-dropdown'
import { MonthlyFormDashboard } from '@/features/dashboard/components/monthly-form-dashboard'
import { useDashboardShortcuts } from '@/features/dashboard/hooks/use-keyboard-shortcuts'
import { aggregateMonthlyRecap } from '@/features/dashboard/services/dashboard-recap.service'
import { usePublicDashboardPayload } from '../hooks'

interface PublicDashboardPageProps {
  token: string
  monthKey: string
}

function formatFormsMeta(
  forms: Array<{ date: string }>,
  locale: Locale
): string {
  if (forms.length === 0) return 'Tidak ada form terpilih'

  const dates = forms
    .map((form) => parseISO(form.date))
    .sort((a, b) => a.getTime() - b.getTime())
  const first = dates[0]
  const last = dates[dates.length - 1]
  const dateLabel =
    first && last && first.getTime() !== last.getTime()
      ? `${format(first, 'dd MMM yyyy', { locale })} - ${format(last, 'dd MMM yyyy', { locale })}`
      : format(first ?? new Date(), 'dd MMM yyyy', { locale })

  return `${forms.length} form terpilih · ${dateLabel}`
}

function setMetaByName(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setMetaByProperty(property: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`
  )
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function PublicDashboardPage({
  token,
  monthKey,
}: PublicDashboardPageProps) {
  const navigate = Route.useNavigate()
  const { formId } = Route.useSearch()
  const monthDate = useMemo(() => parseISO(`${monthKey}-01`), [monthKey])
  const prevMonthDate = useMemo(() => subMonths(monthDate, 1), [monthDate])
  const prevMonthKey = useMemo(
    () => format(prevMonthDate, 'yyyy-MM'),
    [prevMonthDate]
  )
  const { data, isLoading, error, dataUpdatedAt } = usePublicDashboardPayload(
    token,
    monthKey
  )
  const isMonthlyMode =
    data?.status !== 'ok' || data.share.displayMode === 'monthly'
  const { data: prevPayload } = usePublicDashboardPayload(token, prevMonthKey, {
    enabled: data?.status === 'ok' && data.share.displayMode === 'monthly',
  })

  const publicForms = useMemo(
    () =>
      data?.status === 'ok'
        ? data.forms.map((form) => ({
            ...form,
            isActive: true,
          }))
        : [],
    [data]
  )

  const selectedFormId = publicForms.some((form) => form.id === formId)
    ? formId
    : undefined
  const scopedForms = selectedFormId
    ? publicForms.filter((form) => form.id === selectedFormId)
    : publicForms
  const dashboardMonthDate = useMemo(() => {
    if (isMonthlyMode) return monthDate

    const firstForm = [...scopedForms].sort((a, b) =>
      a.date.localeCompare(b.date)
    )[0]
    return firstForm ? parseISO(firstForm.date) : monthDate
  }, [isMonthlyMode, monthDate, scopedForms])

  const selectedRecords = useMemo(() => {
    if (data?.status !== 'ok') return []
    if (!selectedFormId) return data.records
    return data.records.filter((record) => record.form_id === selectedFormId)
  }, [data, selectedFormId])

  const selectedPrevRecords = useMemo(() => {
    if (prevPayload?.status !== 'ok') return []
    if (!selectedFormId) return prevPayload.records
    return prevPayload.records.filter(
      (record) => record.form_id === selectedFormId
    )
  }, [prevPayload, selectedFormId])

  const selectedRecap = useMemo(() => {
    if (data?.status !== 'ok') return undefined
    return aggregateMonthlyRecap(
      selectedRecords,
      dashboardMonthDate,
      data.censusParticipants
    )
  }, [dashboardMonthDate, data, selectedRecords])

  const selectedPrevRecap = useMemo(() => {
    if (!isMonthlyMode) return undefined
    if (prevPayload?.status !== 'ok') return undefined
    return aggregateMonthlyRecap(
      selectedPrevRecords,
      prevMonthDate,
      prevPayload.censusParticipants
    )
  }, [isMonthlyMode, prevPayload, prevMonthDate, selectedPrevRecords])

  const setMonth = (newMonth: Date) => {
    navigate({
      search: (prev) => ({
        ...prev,
        month: format(newMonth, 'yyyy-MM'),
      }),
    })
  }

  const setFormId = (nextFormId: string | undefined) => {
    navigate({
      search: (prev) => ({
        ...prev,
        formId: nextFormId,
      }),
    })
  }

  const prevMonth = () => setMonth(subMonths(monthDate, 1))
  const nextMonth = () => setMonth(addMonths(monthDate, 1))

  useDashboardShortcuts({
    onPrevMonth: isMonthlyMode ? prevMonth : undefined,
    onNextMonth: isMonthlyMode ? nextMonth : undefined,
  })

  useEffect(() => {
    if (data?.status !== 'ok') return

    const title = `${data.share.name} - Dashboard Overview`
    const description =
      data.share.displayMode === 'forms'
        ? `Dashboard overview ${data.share.name} untuk rekap form terpilih.`
        : `Dashboard overview ${data.share.name} untuk rekap absensi bulanan.`
    document.title = title

    setMetaByName('title', title)
    setMetaByName('description', description)
    setMetaByProperty('og:title', title)
    setMetaByProperty('og:description', description)
    setMetaByProperty('og:url', window.location.href)
    setMetaByProperty('twitter:title', title)
    setMetaByProperty('twitter:description', description)
    setMetaByProperty('twitter:url', window.location.href)
  }, [data])

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

  const headerTitle = isMonthlyMode
    ? format(monthDate, 'MMMM yyyy', { locale: idLocale })
    : data.share.name
  const headerDescription = isMonthlyMode
    ? data.share.name
    : formatFormsMeta(scopedForms, idLocale)

  return (
    <main className='min-h-screen bg-background px-4 py-6 sm:px-8 print:px-0'>
      <div className='mx-auto flex max-w-7xl flex-col gap-5'>
        <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <span className='text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase'>
              Dashboard Absensi
            </span>
            <h1 className='text-3xl font-semibold tracking-tight'>
              {headerTitle}
            </h1>
            <p className='text-sm text-muted-foreground'>{headerDescription}</p>
          </div>

          <div className='flex flex-wrap items-center gap-2 print:hidden'>
            {isMonthlyMode && (
              <>
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
              </>
            )}
            <FreshnessPill updatedAt={dataUpdatedAt} />
          </div>
        </header>

        {publicForms.length > 1 && (
          <div className='print:hidden'>
            <FormSelectorDropdown
              forms={publicForms}
              selectedFormId={selectedFormId}
              onSelect={setFormId}
              allLabel={
                isMonthlyMode ? 'Semua Form Desa' : 'Semua Form Terpilih'
              }
            />
          </div>
        )}

        <MonthlyFormDashboard
          formIds={
            selectedFormId
              ? [selectedFormId]
              : data.forms.map((form) => form.id)
          }
          month={dashboardMonthDate}
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
          providedRecap={selectedRecap ?? data.recap}
          providedPrevRecap={isMonthlyMode ? selectedPrevRecap : undefined}
          showKpiDelta={isMonthlyMode}
        />
      </div>
    </main>
  )
}
