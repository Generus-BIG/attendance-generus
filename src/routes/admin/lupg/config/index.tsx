import { createFileRoute } from '@tanstack/react-router'
import { LupgConfig } from '@/features/lupg/config'

export const Route = createFileRoute('/admin/lupg/config/')({
  component: LupgConfig,
})
