import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PhqParticipantsPage } from '@/features/lupg/phq/participants-page'
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

export const Route = createFileRoute('/admin/lupg/phq/participants')({
  validateSearch: searchSchema,
  component: ParticipantsRoute,
})

function ParticipantsRoute() {
  const search = Route.useSearch()
  return (
    <PhqParticipantsPage
      initialMonthKey={search.month ?? currentMonthKey()}
      initialKelompokId={search.kelompok}
    />
  )
}
