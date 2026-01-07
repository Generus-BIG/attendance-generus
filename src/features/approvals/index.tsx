import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApprovalsProvider } from './components/approvals-provider'
import { PendingParticipantsTab } from './components/pending-participants-tab'
import { HistoryApprovalTab } from './components/history-approval-tab'
import { UnmatchedAttendanceTab } from './components/unmatched-attendance-tab'

export function Approvals() {
  return (
    <ApprovalsProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Approval Queue</h2>
            <p className='text-muted-foreground'>
              Kelola pengajuan peserta baru dan absensi yang belum terhubung.
            </p>
          </div>
        </div>

        <Tabs defaultValue='pending' className='w-full'>
          <TabsList>
            <TabsTrigger value='pending'>Pending Participants</TabsTrigger>
            <TabsTrigger value='history'>History Approval</TabsTrigger>
            <TabsTrigger value='unmatched'>Unmatched Attendance</TabsTrigger>
          </TabsList>
          <TabsContent value='pending' className='mt-4'>
            <PendingParticipantsTab />
          </TabsContent>
          <TabsContent value='history' className='mt-4'>
            <HistoryApprovalTab />
          </TabsContent>
          <TabsContent value='unmatched' className='mt-4'>
            <UnmatchedAttendanceTab />
          </TabsContent>
        </Tabs>
      </Main>
    </ApprovalsProvider>
  )
}
