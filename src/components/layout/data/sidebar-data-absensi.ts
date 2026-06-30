import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  UserCheck,
  FileSpreadsheet,
  Share2,
  ShieldCheck,
  Settings,
  UserCog,
  Wrench,
  Palette,
  Bell,
} from 'lucide-react'
import { type Role } from '@/lib/rbac'
import { type NavItem, type NavGroup } from '../types'

export function getAbsensiNavGroups(role: Role): NavGroup[] {
  const generalItems: NavItem[] = [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Peserta',
      url: '/admin/participants',
      icon: Users,
    },
    {
      title: 'Absensi',
      url: '/admin/attendance',
      icon: CalendarCheck,
    },
  ]

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

  if (role === 'super_admin' || role === 'admin') {
    generalItems.push({
      title: 'Dashboard Sharing',
      url: '/admin/dashboard-sharing',
      icon: Share2,
    })
  }

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

  return [
    { title: 'General', items: generalItems },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            { title: 'Profile', url: '/admin/settings', icon: UserCog },
            { title: 'Account', url: '/admin/settings/account', icon: Wrench },
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
  ]
}
