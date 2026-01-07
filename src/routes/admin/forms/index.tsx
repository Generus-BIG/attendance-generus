import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Forms } from '@/features/forms'

const formsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/admin/forms/')({
  validateSearch: formsSearchSchema,
  component: Forms,
})
