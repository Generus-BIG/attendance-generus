import { type NavigateFn } from '@/hooks/use-table-url-state'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ManageRoleDialogs } from './components/manage-role-dialogs'
import { ManageRolePrimaryButtons } from './components/manage-role-primary-buttons'
import { ManageRoleProvider } from './components/manage-role-provider'
import { ManageRoleTable } from './components/manage-role-table'
import { ManageRoleCRUDProvider } from './context/manage-role-context'

type ManageRolePageProps = {
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function ManageRolePage({ search, navigate }: ManageRolePageProps) {
  return (
    <ManageRoleCRUDProvider>
      <ManageRoleProvider>
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
            kicker='Akses Terbatas · Super Admin'
            title='Kelola User & Role'
            description='Buat, ubah, atau hapus akun. Tinjau role dan izin sebelum menyimpan.'
            actions={<ManageRolePrimaryButtons />}
          />
          <ManageRoleTable search={search} navigate={navigate} />
        </Main>

        <ManageRoleDialogs />
      </ManageRoleProvider>
    </ManageRoleCRUDProvider>
  )
}
