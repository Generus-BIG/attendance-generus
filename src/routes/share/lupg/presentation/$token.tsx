import { createFileRoute } from '@tanstack/react-router'
import { PublicPresentationPage } from '@/features/lupg/presentation/public-presentation-page'

export const Route = createFileRoute('/share/lupg/presentation/$token')({
  component: PublicPresentationRoute,
})

function PublicPresentationRoute() {
  const { token } = Route.useParams()
  return <PublicPresentationPage token={token} />
}
