import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { LupgDashboard } from '@/features/lupg/dashboard'
import { isCalendarMonthKey } from '@/features/lupg/utils/month-utils'

const searchSchema = z.object({
  month: z
    .string()
    .refine(isCalendarMonthKey, 'Format bulan harus YYYY-MM')
    .optional(),
})

export const Route = createFileRoute('/admin/lupg/dashboard')({
  component: LupgDashboard,
  validateSearch: searchSchema,
})
