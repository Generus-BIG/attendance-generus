import { Shield, Users, UserCheck } from 'lucide-react'
import { KELOMPOK } from '@/lib/schema'

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
