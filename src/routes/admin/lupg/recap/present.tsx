import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Presentation } from '@/features/lupg/recap/presentation'
import { currentMonthKey } from '@/features/lupg/utils/month-utils'

const presentSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute('/admin/lupg/recap/present')({
  validateSearch: presentSearchSchema,
  component: PresentRoute,
})

function PresentRoute() {
  const search = Route.useSearch()
  return <Presentation monthKey={search.month ?? currentMonthKey()} />
}
