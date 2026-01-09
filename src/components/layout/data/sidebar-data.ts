import {
  LayoutDashboard,
  HelpCircle,
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
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Royanrosyad Admin',
    email: 'admin@mudamudi.big',
    avatar: '/avatars/shadcn.jpg',
  },
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
      items: [
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
        {
          title: 'Approval',
          url: '/admin/approvals',
          icon: UserCheck,
        },
        {
          title: 'Forms',
          url: '/admin/forms',
          icon: FileSpreadsheet,
        },
      ],
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
        {
          title: 'Help Center',
          url: '/admin/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
