import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type Role } from '@/lib/rbac'
import { useAuthStore } from '@/stores/auth-store'
import { type MonthlyReportRow } from '../../types'
import {
  useActivePrograms,
  useYearlyProgramData,
} from '../../hooks/use-lupg-queries'
import { currentMonthKey } from '../../utils/month-utils'
import { ProgramMonthlyCard } from '../../programs/components/program-monthly-card'
import { ProgramQuarterlyCard } from '../../programs/components/program-quarterly-card'

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Tracker</CardTitle>
        <CardDescription>
          Update progress program per bulan / quarter. Data tersinkron ke
          laporan bulanan terkait.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {isLoading ? (
          <div className='text-muted-foreground flex items-center justify-center py-8'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat...
          </div>
        ) : programs.length === 0 ? (
          <div className='text-muted-foreground py-8 text-center'>
            Belum ada program aktif.
          </div>
        ) : (
          programs.map((p) =>
            p.reporting_style === 'quarterly' ? (
              <ProgramQuarterlyCard
                key={p.code}
                program={p}
                kelompokId={report.kelompok_id}
                year={year}
                currentMonthKey={current}
                monthlyReports={data?.monthlyReports ?? []}
                programReports={data?.programReports ?? []}
                userRole={typedRole}
                userOwnsKelompok={userOwnsKelompok && !readOnly}
              />
            ) : (
              <ProgramMonthlyCard
                key={p.code}
                program={p}
                kelompokId={report.kelompok_id}
                year={year}
                currentMonthKey={current}
                monthlyReports={data?.monthlyReports ?? []}
                programReports={data?.programReports ?? []}
                userRole={typedRole}
                userOwnsKelompok={userOwnsKelompok && !readOnly}
              />
            )
          )
        )}
      </CardContent>
    </Card>
  )
}
