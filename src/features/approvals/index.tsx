import { Route } from '@/routes/admin/approvals'
import { usePermissions } from '@/hooks/use-permissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ApprovalsProvider } from './components/approvals-provider'
import { HistoryApprovalTab } from './components/history-approval-tab'
import { PendingParticipantsTab } from './components/pending-participants-tab'
import { SensusSyncTab } from './components/sensus-sync-tab'
import { UnmatchedAttendanceTab } from './components/unmatched-attendance-tab'

export function Approvals() {
  const search = Route.useSearch()
  const { can } = usePermissions()
  const defaultTab =
    search.tab === 'sync' && !can.syncSensus
      ? 'pending'
      : (search.tab ?? 'pending')

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
        <PageHeader
          kicker='Absensi MuMiBig'
          title='Approval Queue'
          description='Review new participant submissions and unmatched attendance.'
        />

        <Tabs defaultValue={defaultTab} className='w-full'>
          <TabsList className='flex h-auto w-full justify-start gap-1 overflow-x-auto p-1'>
            <TabsTrigger value='pending'>Submissions</TabsTrigger>
            <TabsTrigger value='history'>History</TabsTrigger>
            <TabsTrigger value='unmatched'>Unmatched Attendance</TabsTrigger>
            {can.syncSensus && (
              <TabsTrigger value='sync'>Sync Sensus</TabsTrigger>
            )}
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
          {can.syncSensus && (
            <TabsContent value='sync' className='mt-4'>
              <SensusSyncTab runId={search.run} />
            </TabsContent>
          )}
        </Tabs>
      </Main>
    </ApprovalsProvider>
  )
}
