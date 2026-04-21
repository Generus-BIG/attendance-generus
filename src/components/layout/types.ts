import { type LinkProps } from '@tanstack/react-router'
import { type Workspace } from '@/stores/workspace-store'

type User = {
  name: string
  email: string
  avatar: string
  role: string
}

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

export type WorkspaceTeam = {
  key: Workspace
  name: string
  logo: React.ElementType
  plan: string
}

type SidebarData = {
  user: User
  teams: WorkspaceTeam[]
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
