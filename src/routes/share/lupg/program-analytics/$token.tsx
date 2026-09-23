import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PublicAnalyticsPage } from '@/features/lupg/programs/public-analytics-page'

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/share/lupg/program-analytics/$token')({
  validateSearch: searchSchema,
  component: PublicProgramAnalyticsRoute,
})

function PublicProgramAnalyticsRoute() {
  const { token } = Route.useParams()
  const { month } = Route.useSearch()
  return <PublicAnalyticsPage token={token} month={month} />
}
