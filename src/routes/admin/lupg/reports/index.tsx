import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth-store'
import { MonthlyReportsList } from '@/features/lupg/monthly-reports'

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Format bulan harus YYYY-MM')
    .optional(),
})

export const Route = createFileRoute('/admin/lupg/reports/')({
  component: MonthlyReportsList,
  validateSearch: searchSchema,
  beforeLoad: () => {
    const role = useAuthStore.getState().auth.role
    if (role === 'admin' || role === 'super_admin') {
      throw redirect({ to: '/admin/lupg/dashboard' })
    }
  },
})
