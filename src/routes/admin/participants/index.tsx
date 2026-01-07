import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Participants } from '@/features/participants'
import { KELOMPOK, KATEGORI, PARTICIPANT_STATUS } from '@/lib/schema'

const participantsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  // Facet filters
  kelompok: z
    .array(z.enum(KELOMPOK))
    .optional()
    .catch([]),
  kategori: z
    .array(z.enum(KATEGORI))
    .optional()
    .catch([]),
  status: z
    .array(z.enum(PARTICIPANT_STATUS))
    .optional()
    .catch([]),
  // Per-column text filter
  name: z.string().optional().catch(''),
})

export const Route = createFileRoute('/admin/participants/')({
  validateSearch: participantsSearchSchema,
  component: Participants,
})
