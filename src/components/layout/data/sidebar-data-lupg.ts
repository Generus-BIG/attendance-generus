import {
  LayoutDashboard,
  FileText,
  FileBarChart,
  ListTodo,
  UsersRound,
  Settings2,
  Settings,
  UserCog,
  Wrench,
  Palette,
  Bell,
} from 'lucide-react'
import { type Role } from '@/lib/rbac'
import { type NavGroup, type NavItem } from '../types'

export function getLupgNavGroups(role: Role): NavGroup[] {
  const generalItems: NavItem[] = [
    {
      title: 'Dashboard',
      url: '/admin/lupg/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Laporan Bulanan',
      url: '/admin/lupg/reports',
      icon: FileText,
    },
    {
      title: 'Rekap Desa',
      url: '/admin/lupg/recap',
      icon: FileBarChart,
    },
    {
      title: 'Resume Mustin',
      url: '/admin/lupg/mustin',
      icon: ListTodo,
    },
    {
      title: 'Sensus Generus',
      url: '/admin/lupg/sensus',
      icon: UsersRound,
    },
  ]

  if (role === 'super_admin' || role === 'admin') {
    generalItems.push({
      title: 'Konfigurasi',
      url: '/admin/lupg/config',
      icon: Settings2,
    })
  }

  return [
    { title: 'LUPG', items: generalItems },
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
