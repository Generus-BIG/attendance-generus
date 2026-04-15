import { Shield, Users, UserCheck } from 'lucide-react'
import { type Role } from '@/lib/rbac'
import { KELOMPOK } from '@/lib/schema'

export const roleBadgeStyles: Record<Role, string> = {
  super_admin:
    'bg-purple-100/30 text-purple-900 dark:text-purple-200 border-purple-200',
  admin: 'bg-blue-100/30 text-blue-900 dark:text-blue-200 border-blue-200',
  team_manager:
    'bg-amber-100/30 text-amber-900 dark:text-amber-200 border-amber-200',
  member: 'bg-slate-100/30 text-slate-900 dark:text-slate-200 border-slate-200',
}

export const roleOptions = [
  { label: 'Admin', value: 'admin', icon: Shield },
  { label: 'Team Manager', value: 'team_manager', icon: UserCheck },
  { label: 'Member', value: 'member', icon: Users },
] as const

export const allRoleOptions = [
  { label: 'Super Admin', value: 'super_admin', icon: Shield },
  { label: 'Admin', value: 'admin', icon: Shield },
  { label: 'Team Manager', value: 'team_manager', icon: UserCheck },
  { label: 'Member', value: 'member', icon: Users },
] as const

export const kelompokOptions = KELOMPOK.map((k) => ({
  label: k,
  value: k,
  icon: Users,
}))
