import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
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

    // Role-based route protection
    const role = auth.user?.app_metadata?.role as string | undefined
    if (
      location.pathname.startsWith('/admin/manage-role') &&
      role !== 'super_admin' &&
      role !== 'admin'
    ) {
      throw redirect({ to: '/admin/403' })
    }

    // Redirect /admin to /admin/dashboard
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      throw redirect({
        to: '/admin/dashboard',
      })
    }
  },
  component: AuthenticatedLayout,
})
