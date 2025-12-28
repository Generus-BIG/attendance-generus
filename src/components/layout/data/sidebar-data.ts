import {
  LayoutDashboard,
  Monitor,
  HelpCircle,
  Bell,
  Palette,
  Settings,
  Wrench,
  UserCog,
  Users,
  CalendarCheck,
  ClipboardList,
  UserCheck,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  FileSpreadsheet,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin MuMiBig',
    email: 'admin@mumibig.org',
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
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Peserta',
          url: '/participants',
          icon: Users,
        },
        {
          title: 'Absensi',
          url: '/attendance',
          icon: CalendarCheck,
        },
        {
          title: 'Approval',
          url: '/approvals',
          icon: UserCheck,
        },
        {
          title: 'Forms',
          url: '/forms',
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
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
