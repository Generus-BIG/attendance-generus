import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PhqSummaryPage } from '@/features/lupg/phq/summary-page'
import {
  currentMonthKey,
  isCalendarMonthKey,
} from '@/features/lupg/utils/month-utils'

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .refine(isCalendarMonthKey, { message: 'Bulan tidak valid' })
    .optional(),
  kelompok: z.string().uuid().optional(),
})

export const Route = createFileRoute('/admin/lupg/phq/summary')({
  validateSearch: searchSchema,
  component: SummaryRoute,
})

function SummaryRoute() {
  const search = Route.useSearch()
  return (
    <PhqSummaryPage
      initialMonthKey={search.month ?? currentMonthKey()}
      initialKelompokId={search.kelompok}
    />
  )
}
