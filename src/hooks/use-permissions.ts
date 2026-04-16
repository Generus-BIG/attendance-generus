import { useAuthStore } from '@/stores/auth-store'
import { type Permissions, getPermissions } from '@/lib/rbac'

export function usePermissions(): Permissions {
  const { role, kelompok } = useAuthStore((state) => state.auth)
  return {
    role,
    kelompok,
    can: getPermissions(role),
  }
}
