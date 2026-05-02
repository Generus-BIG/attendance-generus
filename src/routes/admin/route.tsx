import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ROUTE_ACCESS, type Role } from '@/lib/rbac'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { WORKSPACE_DEFAULT_PATH } from '@/components/layout/data/sidebar-data'

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

    // Role-based route protection — longest (most specific) prefix wins so that
    // a narrow entry can grant access even when a broader parent would deny it.
    const role: Role = auth.role
    let bestPath: string | null = null
    for (const path of Object.keys(ROUTE_ACCESS)) {
      if (
        location.pathname.startsWith(path) &&
        (bestPath === null || path.length > bestPath.length)
      ) {
        bestPath = path
      }
    }
    if (bestPath !== null && !ROUTE_ACCESS[bestPath].includes(role)) {
      throw redirect({ to: '/admin/403' })
    }

    // Redirect /admin (no child) to active workspace's default page
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      const { activeWorkspace } = useWorkspaceStore.getState()
      const target = WORKSPACE_DEFAULT_PATH[activeWorkspace]
      throw redirect({ to: target })
    }
  },
  component: AuthenticatedLayout,
})
