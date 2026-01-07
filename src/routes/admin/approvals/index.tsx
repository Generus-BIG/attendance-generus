import { createFileRoute } from '@tanstack/react-router'
import { Approvals } from '@/features/approvals'

export const Route = createFileRoute('/admin/approvals/')({
  component: Approvals,
})
