import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { StatsCards } from './components/stats-cards'
import { KelompokChart } from './components/kelompok-chart'
import { AttendancePieChart } from './components/attendance-pie-chart'
import { IndividualReportTable } from './components/individual-report-table'

export function Dashboard() {
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
        <div className='mb-4 flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Dashboard Absensi</h1>
            <p className='text-muted-foreground'>
              Ringkasan kehadiran peserta GPN MuMiBig bulan ini
            </p>
          </div>
        </div>

        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Ringkasan</TabsTrigger>
              <TabsTrigger value='individual'>Laporan Individu</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='overview' className='space-y-4'>
            {/* Stats Cards */}
            <StatsCards />

            {/* Charts Row */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Kehadiran per Kelompok</CardTitle>
                  <CardDescription>
                    Distribusi kehadiran dan izin berdasarkan kelompok
                  </CardDescription>
                </CardHeader>
                <CardContent className='ps-2'>
                  <KelompokChart />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Persentase Kehadiran</CardTitle>
                  <CardDescription>
                    Perbandingan Hadir vs Izin bulan ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AttendancePieChart />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='individual' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Laporan Kehadiran Individu</CardTitle>
                <CardDescription>
                  Tingkat kehadiran masing-masing peserta bulan ini
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IndividualReportTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
