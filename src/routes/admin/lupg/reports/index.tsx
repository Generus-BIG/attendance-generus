import { createFileRoute } from '@tanstack/react-router'
import { MonthlyReportsList } from '@/features/lupg/monthly-reports'

export const Route = createFileRoute('/admin/lupg/reports/')({
  component: MonthlyReportsList,
})
