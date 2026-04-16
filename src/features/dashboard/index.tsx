import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { usePermissions } from '@/hooks/use-permissions'
import { useDashboardState } from './hooks/use-dashboard-state'
import {
  fetchFormsByType,
  fetchKelompokOptions,
} from './services/dashboard-forms.service'
import { MonthlyFormDashboard } from './components/monthly-form-dashboard'
import { KelompokPills } from './components/kelompok-pills'
import { FormSelectorDropdown } from './components/form-selector-dropdown'

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
    setKelompokId,
    setFormId,
  } = useDashboardState()

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
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Dashboard Absensi
            </h2>
            <p className='text-muted-foreground'>
              Rekap kehadiran bulanan per pertemuan.
            </p>
          </div>

          {/* Month Slider */}
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={prevMonth}
              aria-label='Bulan sebelumnya'
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <div
              className='flex min-w-35 items-center justify-center gap-1.5 px-3 text-sm font-medium'
              aria-live='polite'
            >
              <CalendarDays className='h-4 w-4 text-muted-foreground' />
              {format(monthDate, 'MMMM yyyy', { locale: idLocale })}
            </div>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={nextMonth}
              aria-label='Bulan berikutnya'
            >
              <ChevronRight className='h-4 w-4' />
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
              showGroupChart={true}
            />
          </TabsContent>

          {/* Kelompok Tab Content */}
          <TabsContent value='kelompok' className='mt-4 space-y-4'>
            <MonthlyFormDashboard
              formIds={kelompokFormIds}
              month={monthDate}
              showGroupChart={false}
            />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
