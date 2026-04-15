import {
  LayoutDashboard,
  Bell,
  Palette,
  Settings,
  Wrench,
  UserCog,
  Users,
  CalendarCheck,
  UserCheck,
  Command,
  GalleryVerticalEnd,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react'
import { type SidebarData, type NavItem } from '../types'
import { type Role } from '@/lib/rbac'

interface SidebarUserInfo {
  name: string
  email: string
  avatar: string
}

export function getSidebarData(
  role: Role,
  kelompok: string | null,
  user: SidebarUserInfo
): SidebarData {
  const isTM = role === 'team_manager' && kelompok

  const generalItems: NavItem[] = [
    {
      title: isTM ? `Dashboard (default: ${kelompok})` : 'Dashboard',
      url: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: isTM ? `Peserta (${kelompok} only)` : 'Peserta',
      url: '/admin/participants',
      icon: Users,
    },
    {
      title: isTM ? `Absensi (${kelompok} only)` : 'Absensi',
      url: '/admin/attendance',
      icon: CalendarCheck,
    },
  ]

  // Approval: hidden for team_manager
  if (role !== 'team_manager') {
    generalItems.push({
      title: 'Approval',
      url: '/admin/approvals',
      icon: UserCheck,
    })
  }

  generalItems.push({
    title: 'Forms',
    url: '/admin/forms',
    icon: FileSpreadsheet,
  })

  if (role === 'super_admin') {
    generalItems.push({
      title: 'Manage Role',
      url: '/admin/manage-role',
      icon: ShieldCheck,
    })
  } else if (role === 'admin') {
    generalItems.push({
      title: 'Manage Role (view only)',
      url: '/admin/manage-role',
      icon: ShieldCheck,
    })
  }

  return {
    user,
    teams: [
      {
        name: 'Absensi MuMiBig',
        logo: Command,
        plan: 'Dashboard Absensi',
      },
      {
        name: 'GPN',
        logo: GalleryVerticalEnd,
        plan: 'Generus Pra Nikah',
      },
    ],
    navGroups: [
      {
        title: 'General',
        items: generalItems,
      },
      {
        title: 'Other',
        items: [
          {
            title: 'Settings',
            icon: Settings,
            items: [
              {
                title: 'Profile',
                url: '/admin/settings',
                icon: UserCog,
              },
              {
                title: 'Account',
                url: '/admin/settings/account',
                icon: Wrench,
              },
              {
                title: 'Appearance',
                url: '/admin/settings/appearance',
                icon: Palette,
              },
              {
                title: 'Notifications',
                url: '/admin/settings/notifications',
                icon: Bell,
              },
            ],
          },
        ],
      },
    ],
  }
}
