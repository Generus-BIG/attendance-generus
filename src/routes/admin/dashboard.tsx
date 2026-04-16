import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Dashboard } from '@/features/dashboard'
import { format } from 'date-fns'

const dashboardSearchSchema = z.object({
  tab: z.enum(['desa', 'kelompok']).catch('desa'),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .catch(format(new Date(), 'yyyy-MM')),
  kelompokId: z.string().uuid().optional().catch(undefined),
  formId: z.string().uuid().optional().catch(undefined),
})

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>

export const Route = createFileRoute('/admin/dashboard')({
  validateSearch: dashboardSearchSchema,
  component: Dashboard,
})
