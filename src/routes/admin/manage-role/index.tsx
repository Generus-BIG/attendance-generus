import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ManageRolePage } from '@/features/manage-role'

const manageRoleSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  name: z.string().optional().catch(''),
  role: z.array(z.string()).optional().catch([]),
})

export const Route = createFileRoute('/admin/manage-role/')({
  validateSearch: manageRoleSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return <ManageRolePage search={search} navigate={navigate} />
}
