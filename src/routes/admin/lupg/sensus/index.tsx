import { createFileRoute } from '@tanstack/react-router'
import { SensusMaster } from '@/features/lupg/sensus'

export const Route = createFileRoute('/admin/lupg/sensus/')({
  component: SensusMaster,
})
