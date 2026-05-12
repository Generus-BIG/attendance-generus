import { useCallback } from 'react'
import { format, subMonths } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { id as idLocale } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, FileDown } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { FormSelectorDropdown } from './components/form-selector-dropdown'
import { KelompokPills } from './components/kelompok-pills'
import { MonthlyFormDashboard } from './components/monthly-form-dashboard'
import { useDashboardState } from './hooks/use-dashboard-state'
import { useDashboardShortcuts } from './hooks/use-keyboard-shortcuts'
import {
  fetchFormsByType,
  fetchKelompokOptions,
} from './services/dashboard-forms.service'

export function Dashboard() {
  const { role, kelompok } = usePermissions()
  const {
    tab,
    monthDate,
    kelompokId,
    formId,
    setTab,
    prevMonth,
    nextMonth,
    jumpToCurrentMonth,
    setKelompokId,
    setFormId,
  } = useDashboardState()

  const handleExport = useCallback(() => {
    window.print()
  }, [])

  useDashboardShortcuts({
    onPrevMonth: prevMonth,
    onNextMonth: nextMonth,
    onJumpToToday: jumpToCurrentMonth,
    onExport: handleExport,
  })

  const prevMonthDate = subMonths(monthDate, 1)

  // Fetch kelompok options (for pills)
  const { data: kelompokOptions = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: fetchKelompokOptions,
  })

  // Auto-resolve kelompokId
  const resolvedKelompokId = (() => {
    if (kelompokId) return kelompokId
    if (role === 'team_manager' && kelompok) {
      const match = kelompokOptions.find((k) => k.value === kelompok)
      return match?.id
    }
    return kelompokOptions[0]?.id
  })()

  // Fetch forms for current tab
  const { data: desaForms = [] } = useQuery({
    queryKey: ['dashboard-forms', 'desa'],
    queryFn: () => fetchFormsByType({ formType: 'desa' }),
    enabled: tab === 'desa',
  })

  const { data: kelompokForms = [] } = useQuery({
    queryKey: ['dashboard-forms', 'kelompok', resolvedKelompokId],
    queryFn: () =>
      fetchFormsByType({
        formType: 'kelompok',
        kelompokId: resolvedKelompokId,
      }),
    enabled: tab === 'kelompok' && !!resolvedKelompokId,
  })

  // Determine formIds for recap
  const desaFormIds =
    formId && desaForms.some((f) => f.id === formId)
      ? [formId]
      : desaForms.map((f) => f.id)

  const kelompokFormIds = kelompokForms.map((f) => f.id)

  // Filter pills for team_manager
  const visibleKelompokOptions =
    role === 'team_manager'
      ? kelompokOptions.filter((k) => k.value === kelompok)
      : kelompokOptions

  return (
    <>
      <style>{`
        @media print {
          [data-sidebar],
          aside,
          header.header-fixed,
          header.sticky,
          header.fixed,
          nav,
          .print\\:hidden {
            display: none !important;
          }
          main, [role="main"] {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
          table { break-inside: avoid; }
          .card, [class*="border"] { box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
      {/* ===== Top Heading ===== */}
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main Content ===== */}
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Page header + month slider */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='flex flex-col gap-1'>
            <span className='text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase'>
              Dashboard Absensi
            </span>
            <h2 className='text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]'>
              {format(monthDate, 'MMMM yyyy', { locale: idLocale })}
            </h2>
            <p className='text-sm text-muted-foreground'>
              Rekap kehadiran bulanan per pertemuan.
            </p>
          </div>

          {/* Month Slider + Export */}
          <div className='flex flex-wrap items-center gap-2 print:hidden'>
            <span
              className='hidden text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase md:inline'
              aria-hidden='true'
            >
              ← / → switch month
            </span>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                className='h-11 w-11'
                onClick={prevMonth}
                aria-label='Bulan sebelumnya'
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
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
            <span
              aria-hidden='true'
              className='hidden h-6 w-px bg-border sm:inline-block'
            />
            <Button variant='outline' size='sm' onClick={handleExport}>
              <FileDown className='mr-2 h-4 w-4' />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'desa' | 'kelompok')}
        >
          <div className='flex flex-wrap items-center gap-3'>
            <TabsList>
              <TabsTrigger value='desa'>Desa</TabsTrigger>
              <TabsTrigger value='kelompok'>Kelompok</TabsTrigger>
            </TabsList>

            {/* Tab-specific controls inline */}
            {tab === 'desa' && (
              <FormSelectorDropdown
                forms={desaForms}
                selectedFormId={formId}
                onSelect={setFormId}
              />
            )}
            {tab === 'kelompok' && (
              <KelompokPills
                options={visibleKelompokOptions}
                selectedId={resolvedKelompokId}
                onSelect={setKelompokId}
              />
            )}
          </div>

          {/* Desa Tab Content */}
          <TabsContent value='desa' className='mt-4 space-y-4'>
            <MonthlyFormDashboard
              formIds={desaFormIds}
              month={monthDate}
              prevMonth={prevMonthDate}
              showGroupChart={true}
            />
          </TabsContent>

          {/* Kelompok Tab Content */}
          <TabsContent value='kelompok' className='mt-4 space-y-4'>
            <MonthlyFormDashboard
              formIds={kelompokFormIds}
              month={monthDate}
              prevMonth={prevMonthDate}
              kelompokId={resolvedKelompokId}
              showGroupChart={false}
            />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
