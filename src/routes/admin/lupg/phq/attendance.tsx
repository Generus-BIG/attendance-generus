import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PhqAttendancePage } from '@/features/lupg/phq/attendance-page'
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

export const Route = createFileRoute('/admin/lupg/phq/attendance')({
  validateSearch: searchSchema,
  component: AttendanceRoute,
})

function AttendanceRoute() {
  const search = Route.useSearch()
  return (
    <PhqAttendancePage
      initialMonthKey={search.month ?? currentMonthKey()}
      initialKelompokId={search.kelompok}
    />
  )
}
