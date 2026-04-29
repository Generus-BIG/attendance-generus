import { Command, GalleryVerticalEnd } from 'lucide-react'
import { type LinkProps } from '@tanstack/react-router'
import { type Role } from '@/lib/rbac'
import { type Workspace } from '@/stores/workspace-store'
import { type SidebarData, type WorkspaceTeam } from '../types'
import { getAbsensiNavGroups } from './sidebar-data-absensi'
import { getLupgNavGroups } from './sidebar-data-lupg'

interface SidebarUserInfo {
  name: string
  email: string
  avatar: string
  role: string
}

export const WORKSPACE_TEAMS: WorkspaceTeam[] = [
  {
    key: 'absensi',
    name: 'Absensi MuMiBig',
    logo: Command,
    plan: 'Dashboard Absensi',
  },
  {
    key: 'lupg',
    name: 'LUPG',
    logo: GalleryVerticalEnd,
    plan: 'Laporan Bulanan',
  },
]

export const WORKSPACE_DEFAULT_PATH: Record<Workspace, LinkProps['to']> = {
  absensi: '/admin/dashboard',
  lupg: '/admin/lupg/reports',
}

export function getSidebarData(
  role: Role,
  _kelompok: string | null,
  user: SidebarUserInfo,
  workspace: Workspace
): SidebarData {
  const navGroups =
    workspace === 'lupg'
      ? getLupgNavGroups(role)
      : getAbsensiNavGroups(role)

  return {
    user,
    teams: WORKSPACE_TEAMS,
    navGroups,
  }
}
