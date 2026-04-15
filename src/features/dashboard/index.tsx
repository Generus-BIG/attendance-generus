import { useState } from 'react'
import { startOfMonth } from 'date-fns'
import { X } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { MonthNavigator } from './components/month-navigator'
import { MonthlyFormDashboard } from './components/monthly-form-dashboard'

export function Dashboard() {
  // MVP: use current month, can be extended with month picker later
  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date())
  )

  const { role, kelompok } = usePermissions()
  const [selectedKelompok, setSelectedKelompok] = useState<string | null>(
    role === 'team_manager' ? kelompok : null
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
            <h1 className='text-2xl font-bold tracking-tight'>
              Dashboard Absensi
            </h1>
            <p className='text-muted-foreground'>
              Rekap bulanan per form absensi (pertemuan mingguan)
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {selectedKelompok && (
              <Badge variant='secondary' className='gap-1 text-sm'>
                {selectedKelompok}
                <button
                  onClick={() => setSelectedKelompok(null)}
                  className='ml-1 rounded-full p-0.5 hover:bg-muted'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            )}
            {!selectedKelompok && role === 'team_manager' && kelompok && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setSelectedKelompok(kelompok)}
              >
                Filter: {kelompok}
              </Button>
            )}
            <MonthNavigator
              date={selectedMonth}
              onDateChange={setSelectedMonth}
            />
          </div>
        </div>

        <Tabs
          orientation='vertical'
          defaultValue='profmud'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='profmud'>Profmud GPN</TabsTrigger>
              <TabsTrigger value='ar'>AR Intensif</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='profmud' className='space-y-4'>
            {/* TODO: wire selectedKelompok into data query when dashboard data layer is refactored */}
            <MonthlyFormDashboard formKey='profmud' month={selectedMonth} />
          </TabsContent>

          <TabsContent value='ar' className='space-y-4'>
            {/* TODO: wire selectedKelompok into data query when dashboard data layer is refactored */}
            <MonthlyFormDashboard formKey='ar' month={selectedMonth} />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
