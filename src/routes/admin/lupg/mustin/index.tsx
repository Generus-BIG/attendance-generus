import { createFileRoute } from '@tanstack/react-router'
import { MustinCrossReport } from '@/features/lupg/mustin'

export const Route = createFileRoute('/admin/lupg/mustin/')({
  component: MustinCrossReport,
})
