import { createFileRoute } from '@tanstack/react-router'
import { FormsLandingFallback } from '@/features/forms/components/public-form-page'

export const Route = createFileRoute('/forms/')({
  component: FormsLandingFallback,
})
