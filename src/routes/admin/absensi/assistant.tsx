import { createFileRoute } from '@tanstack/react-router'
import { AssistantPage } from '@/features/assistant/assistant-page'

export const Route = createFileRoute('/admin/absensi/assistant')({
  component: () => <AssistantPage workspace='absensi' />,
})
