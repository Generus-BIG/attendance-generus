import { createFileRoute } from '@tanstack/react-router'
import { MonthlyReportEdit } from '@/features/lupg/monthly-reports/edit'

export const Route = createFileRoute('/admin/lupg/reports/$monthlyReportId')({
  component: MonthlyReportEditRoute,
})

function MonthlyReportEditRoute() {
  const { monthlyReportId } = Route.useParams()
  return <MonthlyReportEdit monthlyReportId={monthlyReportId} />
}
