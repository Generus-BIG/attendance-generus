import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { IntensifPage } from '@/features/lupg/intensif/intensif-page'
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

export const Route = createFileRoute('/admin/lupg/ar-intensif/')({
  validateSearch: searchSchema,
  component: ArIntensifRoute,
})

function ArIntensifRoute() {
  const search = Route.useSearch()
  return (
    <IntensifPage
      program='AR_INTENSIF'
      initialMonthKey={search.month ?? currentMonthKey()}
      initialKelompokId={search.kelompok}
    />
  )
}
