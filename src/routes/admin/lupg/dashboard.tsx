import { createFileRoute } from '@tanstack/react-router'
import { LupgDashboard } from '@/features/lupg/dashboard'

export const Route = createFileRoute('/admin/lupg/dashboard')({
  component: LupgDashboard,
})
