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
  TrendingUp,
  Presentation,
} from 'lucide-react'
import { type Role } from '@/lib/rbac'
import { type NavGroup, type NavItem } from '../types'

export function getLupgNavGroups(role: Role): NavGroup[] {
  const isAdmin = role === 'super_admin' || role === 'admin'

  const generalItems: NavItem[] = []

  if (isAdmin) {
    generalItems.push({
      title: 'Dashboard',
      url: '/admin/lupg/dashboard',
      icon: LayoutDashboard,
    })
  }

  generalItems.push({
    title: 'Laporan Bulanan',
    url: '/admin/lupg/reports',
    icon: FileText,
  })

  if (isAdmin) {
    generalItems.push({
      title: 'Rekap Desa',
      url: '/admin/lupg/recap',
      icon: FileBarChart,
    })
  }

  if (isAdmin) {
    generalItems.push({
      title: 'Resume Mustin',
      url: '/admin/lupg/mustin',
      icon: ListTodo,
    })
  }

  generalItems.push({
    title: 'Program Analytics',
    url: '/admin/lupg/programs',
    icon: TrendingUp,
  })

  generalItems.push({
    title: 'Presentation Mode',
    url: '/admin/lupg/presentation',
    icon: Presentation,
  })

  generalItems.push({
    title: 'Sensus Generus',
    url: '/admin/lupg/sensus',
    icon: UsersRound,
  })

  if (isAdmin) {
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
            { title: 'Appearance', url: '/admin/settings/appearance', icon: Palette },
            { title: 'Notifications', url: '/admin/settings/notifications', icon: Bell },
          ],
        },
      ],
    },
  ]
}
