import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Approvals } from '@/features/approvals'

const approvalsSearchSchema = z.object({
  tab: z.string().optional(),
  run: z.string().optional(),
})

export const Route = createFileRoute('/admin/approvals/')({
  validateSearch: approvalsSearchSchema,
  component: Approvals,
})
