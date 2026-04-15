import { useEffect, useRef } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { usePermissions } from '@/hooks/use-permissions'
import { ParticipantsDialogs } from './components/participants-dialogs'
import { ParticipantsPrimaryButtons } from './components/participants-primary-buttons'
import { ParticipantsProvider } from './components/participants-provider'
import { ParticipantsCRUDProvider } from './context/participants-context'
import { ParticipantsTable } from './components/participants-table'

const route = getRouteApi('/admin/participants/')

export function Participants() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { role, kelompok } = usePermissions()
  const hasSetDefault = useRef(false)

  // Auto-set kelompok filter for team_manager on first visit
  useEffect(() => {
    if (
      role === 'team_manager' &&
      kelompok &&
      !hasSetDefault.current &&
      (!search.kelompok || search.kelompok.length === 0)
    ) {
      hasSetDefault.current = true
      navigate({
        search: (prev) => ({
          ...prev,
          kelompok: [kelompok] as typeof prev.kelompok,
        }),
        replace: true,
      })
    }
  }, [role, kelompok, search.kelompok, navigate])

  return (
    <ParticipantsCRUDProvider>
      <ParticipantsProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Daftar Peserta</h2>
            <p className='text-muted-foreground'>
              Kelola data peserta GPN MuMiBig di sini.
            </p>
          </div>
          <ParticipantsPrimaryButtons />
        </div>
        <ParticipantsTable search={search} navigate={navigate} />
      </Main>

      <ParticipantsDialogs />
    </ParticipantsProvider>
    </ParticipantsCRUDProvider>
  )
}
