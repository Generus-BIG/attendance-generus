import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { YearlyProgramTracker } from '@/features/lupg/programs'

const programsSearchSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  kelompok: z.string().uuid().optional(),
  tab: z.enum(['desa', 'kelompok']).optional(),
})

export const Route = createFileRoute('/admin/lupg/programs/')({
  validateSearch: programsSearchSchema,
  component: ProgramsRoute,
})

function ProgramsRoute() {
  const search = Route.useSearch()
  const initialYear = search.year
    ? parseInt(search.year, 10)
    : new Date().getFullYear()
  return (
    <YearlyProgramTracker
      initialYear={initialYear}
      initialKelompokId={search.kelompok}
      initialTab={search.tab}
    />
  )
}
