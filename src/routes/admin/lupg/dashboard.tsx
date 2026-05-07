import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LupgDashboard } from '@/features/lupg/dashboard'

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Format bulan harus YYYY-MM')
    .optional(),
})

export const Route = createFileRoute('/admin/lupg/dashboard')({
  component: LupgDashboard,
  validateSearch: searchSchema,
})
