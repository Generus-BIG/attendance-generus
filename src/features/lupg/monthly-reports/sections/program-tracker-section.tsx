import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { type Role } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'
import { PROGRAM_ORDER } from '../../constants'
import {
  useAllPrograms,
  useYearlyProgramData,
} from '../../hooks/use-lupg-queries'
import { ProgramClusterBody } from '../../programs/components/program-cluster-card'
import { ProgramMonthlyBody } from '../../programs/components/program-monthly-card'
import { ProgramQuarterlyBody } from '../../programs/components/program-quarterly-card'
import {
  getQuarterStartMonthKey,
  type Quarter,
} from '../../programs/utils/editability'
import { type MonthlyReportRow, type ProgramDefinitionRow } from '../../types'
import { ProgramSectionCard } from '../components/program-section-card'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly?: boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export function selectReportPrograms(programs: ProgramDefinitionRow[]) {
  const visible = programs.filter(
    (program) => program.active || program.code === 'SHOLAT_ACR'
  )
  const byCode = new Map(visible.map((program) => [program.code, program]))
  return [
    ...PROGRAM_ORDER.flatMap((code) => {
      const program = byCode.get(code)
      return program ? [program] : []
    }),
    ...visible.filter(
      (program) =>
        !PROGRAM_ORDER.includes(program.code as (typeof PROGRAM_ORDER)[number])
    ),
  ]
}

export function ProgramTrackerSection({ report, readOnly = false }: Props) {
  const role = useAuthStore((s) => s.auth.role)
  const kelompok = useAuthStore((s) => s.auth.kelompok)
  const typedRole = role as Role
  const isTeamManager = typedRole === 'team_manager'

  const year = parseInt(report.month.slice(0, 4), 10)

  const { data, isLoading } = useYearlyProgramData(report.kelompok_id, year)
  const { data: programs = [] } = useAllPrograms()
  const orderedPrograms = useMemo(
    () => selectReportPrograms(programs),
    [programs]
  )

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
      ) : orderedPrograms.length === 0 ? (
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
              currentMonthKey: reportMonthKey,
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
                currentMonthKey={
                  p.reporting_style === 'quarterly'
                    ? getQuarterStartMonthKey(
                        Math.ceil(
                          parseInt(reportMonthKey.slice(5), 10) / 3
                        ) as Quarter,
                        year
                      )
                    : reportMonthKey
                }
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
