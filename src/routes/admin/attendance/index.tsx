import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Attendance } from '@/features/attendance'
import { KELOMPOK, KATEGORI, ATTENDANCE_STATUS } from '@/lib/schema'

const attendanceSearchSchema = z.object({
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
    .array(z.enum(ATTENDANCE_STATUS))
    .optional()
    .catch([]),
  // Per-column text filter
  name: z.string().optional().catch(''),
  // Date range (yyyy-MM-dd, inclusive)
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/admin/attendance/')({
  validateSearch: attendanceSearchSchema,
  component: Attendance,
})
