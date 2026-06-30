import { z } from 'zod'
import { format } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'
import { PublicDashboardPage } from '@/features/public-dashboard/components/public-dashboard-page'

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/share/dashboard/$token')({
  validateSearch: searchSchema,
  component: PublicDashboardRoute,
})

function PublicDashboardRoute() {
  const { token } = Route.useParams()
  const { month } = Route.useSearch()

  return (
    <PublicDashboardPage
      token={token}
      monthKey={month ?? format(new Date(), 'yyyy-MM')}
    />
  )
}
