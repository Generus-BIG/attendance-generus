import { useAuthStore } from '@/stores/auth-store'
import { useLayout } from '@/context/layout-provider'
import { useActiveWorkspace } from '@/hooks/use-active-workspace'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { getSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { user, role, kelompok } = useAuthStore((state) => state.auth)
  const { activeWorkspace } = useActiveWorkspace()

  const sidebarData = getSidebarData(
    role,
    kelompok,
    {
      name: (user?.user_metadata?.full_name as string) || user?.email || 'User',
      email: user?.email || '',
      avatar: '/avatars/shadcn.jpg',
      role,
    },
    activeWorkspace
  )

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
