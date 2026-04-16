import { type Role } from '@/lib/rbac'

export interface ManagedUser {
  id: string
  email: string
  full_name: string | null
  role: Role
  kelompok: string | null
  temp_password: string | null
  created_at: string
}
