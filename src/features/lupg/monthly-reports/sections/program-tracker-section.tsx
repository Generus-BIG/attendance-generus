import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { type Role } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'
import { PROGRAM_ORDER } from '../../constants'
import {
  useActivePrograms,
  useYearlyProgramData,
} from '../../hooks/use-lupg-queries'
import { ProgramClusterBody } from '../../programs/components/program-cluster-card'
import { ProgramMonthlyBody } from '../../programs/components/program-monthly-card'
import { ProgramQuarterlyBody } from '../../programs/components/program-quarterly-card'
import { type MonthlyReportRow, type ProgramDefinitionRow } from '../../types'
import { currentMonthKey } from '../../utils/month-utils'
import { ProgramSectionCard } from '../components/program-section-card'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly?: boolean
}

export function ProgramTrackerSection({ report, readOnly = false }: Props) {
  const role = useAuthStore((s) => s.auth.role)
  const kelompok = useAuthStore((s) => s.auth.kelompok)
  const typedRole = role as Role
  const isTeamManager = typedRole === 'team_manager'

  const year = parseInt(report.month.slice(0, 4), 10)
  const current = currentMonthKey()

  const { data, isLoading } = useYearlyProgramData(report.kelompok_id, year)
  const { data: programs = [] } = useActivePrograms()

  const orderedPrograms = useMemo(() => {
    const byCode = new Map(programs.map((p) => [p.code, p]))
    const ordered: ProgramDefinitionRow[] = []
    for (const code of PROGRAM_ORDER) {
      const p = byCode.get(code)
      if (p) ordered.push(p)
    }
    // Append any active programs not in the list
    for (const p of programs) {
      if (!PROGRAM_ORDER.includes(p.code as (typeof PROGRAM_ORDER)[number])) {
        ordered.push(p)
      }
    }
    return ordered
  }, [programs])

  const { data: kelompokOptions = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data: lv, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return lv as { id: string; value: string }[]
    },
  })

  const userOwnsKelompok = useMemo(() => {
    if (!isTeamManager) return true
    return kelompokOptions.some(
      (o) => o.id === report.kelompok_id && o.value === kelompok
    )
  }, [isTeamManager, kelompok, kelompokOptions, report.kelompok_id])

  const reportMonthKey = report.month.slice(0, 7)

  return (
    <section
      id='section-program-tracker'
      className='flex scroll-mt-24 flex-col gap-4'
    >
      <SectionHeading
        kicker='Program Tracker'
        description='Update progress program per bulan / quarter. Data tersinkron ke laporan bulanan terkait.'
      />

      {isLoading ? (
        <div className='flex items-center justify-center rounded-xl border bg-card py-8 text-muted-foreground shadow-sm'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
          Memuat...
        </div>
      ) : programs.length === 0 ? (
        <div className='rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground shadow-sm'>
          Belum ada program aktif.
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {orderedPrograms.map((p) => {
            const commonProps = {
              program: p,
              kelompokId: report.kelompok_id,
              year,
              currentMonthKey: current,
              monthlyReports: data?.monthlyReports ?? [],
              programReports: data?.programReports ?? [],
              userRole: typedRole,
              userOwnsKelompok: userOwnsKelompok && !readOnly,
            }
            const body =
              p.code === 'NIKAH_JM' ? (
                <ProgramClusterBody {...commonProps} />
              ) : p.reporting_style === 'quarterly' ? (
                <ProgramQuarterlyBody {...commonProps} />
              ) : (
                <ProgramMonthlyBody {...commonProps} />
              )
            return (
              <ProgramSectionCard
                key={p.code}
                program={p}
                currentMonthKey={reportMonthKey}
                monthlyReports={data?.monthlyReports ?? []}
                programReports={data?.programReports ?? []}
              >
                {body}
              </ProgramSectionCard>
            )
          })}
        </div>
      )}
    </section>
  )
}
