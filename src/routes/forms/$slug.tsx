import { createFileRoute } from '@tanstack/react-router'
import { PublicFormPage } from '@/features/forms/components/public-form-page'

export const Route = createFileRoute('/forms/$slug')({
  component: LocalPublicFormRoute,
})

function LocalPublicFormRoute() {
  const { slug } = Route.useParams()

  return <PublicFormPage slug={slug} />
}
