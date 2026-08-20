import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { RekapDesa } from '@/features/lupg/recap'

const recapSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute('/admin/lupg/recap/')({
  validateSearch: recapSearchSchema,
  component: RekapDesa,
})
