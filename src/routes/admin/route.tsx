import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ROUTE_ACCESS, type Role } from '@/lib/rbac'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const store = useAuthStore.getState()
    if (store.auth.isLoading) {
      await store.auth.checkSession()
    }
    const { auth } = useAuthStore.getState()
    if (!auth.accessToken) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    // Role-based route protection using ROUTE_ACCESS map
    const role: Role = auth.role
    for (const [path, allowedRoles] of Object.entries(ROUTE_ACCESS)) {
      if (
        location.pathname.startsWith(path) &&
        !allowedRoles.includes(role)
      ) {
        throw redirect({ to: '/admin/403' })
      }
    }

    // Redirect /admin to /admin/dashboard
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      throw redirect({
        to: '/admin/dashboard',
        search: { tab: 'desa', month: new Date().toLocaleDateString('sv').slice(0, 7) },
      })
    }
  },
  component: AuthenticatedLayout,
})
