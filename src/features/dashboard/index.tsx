import { useMemo, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { MonthlyFormDashboard } from './components/monthly-form-dashboard'

export function Dashboard() {
  // MVP: use current month, can be extended with month picker later
  const [selectedMonth] = useState(() => startOfMonth(new Date()))

  const monthLabel = useMemo(
    () => format(selectedMonth, 'MMMM yyyy', { locale: idLocale }),
    [selectedMonth]
  )

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Dashboard Absensi</h1>
            <p className='text-muted-foreground'>
              Rekap bulanan per form absensi (pertemuan mingguan)
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' className='pointer-events-none'>
              <Calendar className='mr-2 h-4 w-4' />
              {monthLabel}
            </Button>
            {/* TODO: Add month picker popover for navigation */}
          </div>
        </div>

        <Tabs orientation='vertical' defaultValue='profmud' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='profmud'>Profmud GPN</TabsTrigger>
              <TabsTrigger value='ar'>AR Intensif</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='profmud' className='space-y-4'>
            <MonthlyFormDashboard formKey='profmud' month={selectedMonth} />
          </TabsContent>

          <TabsContent value='ar' className='space-y-4'>
            <MonthlyFormDashboard formKey='ar' month={selectedMonth} />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
