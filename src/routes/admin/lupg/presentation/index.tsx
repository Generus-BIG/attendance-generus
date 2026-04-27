import { createFileRoute } from '@tanstack/react-router'
import { PresentationPicker } from '@/features/lupg/presentation/picker'

export const Route = createFileRoute('/admin/lupg/presentation/')({
  component: PresentationPicker,
})
