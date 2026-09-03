import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Presentation } from '@/features/lupg/recap/presentation'
import {
  isReportMonthAvailable,
  reportMonthKey,
} from '@/features/lupg/utils/month-utils'

const presentSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  kelompok: z.string().uuid().optional(),
})

export const Route = createFileRoute('/admin/lupg/recap/present')({
  validateSearch: presentSearchSchema,
  component: PresentRoute,
})

function PresentRoute() {
  const search = Route.useSearch()
  return (
    <Presentation
      monthKey={
        search.month && isReportMonthAvailable(search.month)
          ? search.month
          : reportMonthKey()
      }
      kelompokFilter={search.kelompok}
    />
  )
}
