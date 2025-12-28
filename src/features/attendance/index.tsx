import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AttendanceDialogs } from './components/attendance-dialogs'
import { AttendancePrimaryButtons } from './components/attendance-primary-buttons'
import { AttendanceProvider } from './components/attendance-provider'
import { AttendanceTable } from './components/attendance-table'

const route = getRouteApi('/_authenticated/attendance/')

export function Attendance() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  return (
    <AttendanceProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Log Absensi</h2>
            <p className='text-muted-foreground'>
              Lihat dan kelola data kehadiran peserta.
            </p>
          </div>
          <AttendancePrimaryButtons />
        </div>
        <AttendanceTable search={search} navigate={navigate} />
      </Main>

      <AttendanceDialogs />
    </AttendanceProvider>
  )
}
