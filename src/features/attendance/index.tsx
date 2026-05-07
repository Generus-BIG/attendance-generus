import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AttendanceDialogs } from './components/attendance-dialogs'
import { AttendancePrimaryButtons } from './components/attendance-primary-buttons'
import { AttendanceProvider } from './components/attendance-provider'
import { AttendanceTable } from './components/attendance-table'

const route = getRouteApi('/admin/attendance/')

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
        <PageHeader
          kicker='Absensi MuMiBig'
          title='Log Absensi'
          description='Lihat dan kelola data kehadiran peserta.'
          actions={<AttendancePrimaryButtons />}
        />
        <AttendanceTable search={search} navigate={navigate} />
      </Main>

      <AttendanceDialogs />
    </AttendanceProvider>
  )
}
