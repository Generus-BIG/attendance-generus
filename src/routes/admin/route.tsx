import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

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
    // Redirect /admin to /admin/dashboard
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      throw redirect({
        to: '/admin/dashboard',
      })
    }
  },
  component: AuthenticatedLayout,
})
