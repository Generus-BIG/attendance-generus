import { createFileRoute } from '@tanstack/react-router'
import { DashboardSharingPage } from '@/features/dashboard-sharing/components/dashboard-sharing-page'

export const Route = createFileRoute('/admin/dashboard-sharing/')({
  component: DashboardSharingPage,
})
