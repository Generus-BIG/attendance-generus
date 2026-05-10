import { createFileRoute } from '@tanstack/react-router'
import { PublicFormPage } from '@/features/forms/components/public-form-page'

export const Route = createFileRoute('/absensi/$formId')({
  component: PublicAbsensiFormRoute,
})

function PublicAbsensiFormRoute() {
  const { formId } = Route.useParams()

  return <PublicFormPage slug={formId} />
}
