import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PresentationPicker } from '@/features/lupg/presentation/picker'
import {
  isReportMonthAvailable,
  reportMonthKey,
} from '@/features/lupg/utils/month-utils'

const presentationSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  kelompok: z.string().uuid().optional(),
})

export const Route = createFileRoute('/admin/lupg/presentation/')({
  validateSearch: presentationSearchSchema,
  component: PresentationPickerRoute,
})

function PresentationPickerRoute() {
  const search = Route.useSearch()
  return (
    <PresentationPicker
      initialMonthKey={
        search.month && isReportMonthAvailable(search.month)
          ? search.month
          : reportMonthKey()
      }
      initialKelompokId={search.kelompok}
    />
  )
}
