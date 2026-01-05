import { useState } from 'react'
import { startOfMonth } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { MonthlyFormDashboard } from './components/monthly-form-dashboard'
import { MonthNavigator } from './components/month-navigator'

export function Dashboard() {
  // MVP: use current month, can be extended with month picker later
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))

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
          <MonthNavigator 
            date={selectedMonth} 
            onDateChange={setSelectedMonth} 
          />
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
