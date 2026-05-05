import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { type Role } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { KelompokSelector } from '../components/kelompok-selector'
import { MonthPicker } from '../components/month-picker'
import {
  useActivePrograms,
  useYearlyMatrixData,
  useYearlyProgramData,
} from '../hooks/use-lupg-queries'
import { AttendanceCharts } from '../monthly-reports/sections/attendance-charts'
import { currentMonthKey } from '../utils/month-utils'
import { DesaOverviewTab } from './components/desa-overview-tab'
import { ProgramAnalyticsCard } from './components/program-analytics-card'
import { YearPicker } from './components/year-picker'

interface Props {
  initialYear: number
  initialKelompokId?: string
  initialTab?: 'desa' | 'kelompok'
}

export function YearlyProgramTracker({
  initialYear,
  initialKelompokId,
  initialTab,
}: Props) {
  const [year, setYear] = useState(initialYear)
  const [kelompokId, setKelompokId] = useState<string | undefined>(
    initialKelompokId
  )

  const role = useAuthStore((s) => s.auth.role)
  const kelompokName = useAuthStore((s) => s.auth.kelompok)
  const typedRole = role as Role
  const isTeamManager = typedRole === 'team_manager'

  // Admin default = 'desa'; TM forced to 'kelompok' (Desa Overview hidden).
  const defaultTab: 'desa' | 'kelompok' = initialTab ?? 'desa'
  const [tab, setTabState] = useState<'desa' | 'kelompok'>(defaultTab)
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey())

  // Sync tab to URL so admins can bookmark either view.
  const navigate = useNavigate()
  const setTab = (next: 'desa' | 'kelompok') => {
    setTabState(next)
    navigate({
      to: '/admin/lupg/programs',
      search: {
        tab: next,
        year: String(year),
        ...(kelompokId ? { kelompok: kelompokId } : {}),
      },
    })
  }

  // If user changes year, snap monthKey to Dec of that year (derived — no effect needed).
  const effectiveMonthKey = monthKey.startsWith(`${year}-`)
    ? monthKey
    : `${year}-12`
  const effectiveTab: 'desa' | 'kelompok' = isTeamManager ? 'kelompok' : tab

  const { data: kelompokOptions = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return data as { id: string; value: string }[]
    },
  })

  const tmKelompokId = useMemo(
    () => kelompokOptions.find((o) => o.value === kelompokName)?.id,
    [kelompokOptions, kelompokName]
  )

  const resolvedKelompokId: string | undefined = isTeamManager
    ? tmKelompokId
    : kelompokId

  const { data, isLoading } = useYearlyProgramData(resolvedKelompokId, year)
  const { data: matrixData } = useYearlyMatrixData(resolvedKelompokId, year)
  const { data: programs = [] } = useActivePrograms()
  const current = currentMonthKey()

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Program Analytics {year}
            </h2>
            <p className='text-muted-foreground'>
              Monitoring progres program per kelompok. Input dilakukan di
              halaman Laporan Bulanan.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {effectiveTab === 'desa' ? (
              <MonthPicker monthKey={effectiveMonthKey} onChange={setMonthKey} />
            ) : !isTeamManager ? (
              <KelompokSelector value={kelompokId} onChange={setKelompokId} />
            ) : null}
            <YearPicker year={year} onChange={setYear} />
          </div>
        </div>
        {!isTeamManager && (
          <div className='flex border-b'>
            <button
              type='button'
              onClick={() => setTab('desa')}
              className={
                effectiveTab === 'desa'
                  ? 'border-primary border-b-2 px-4 py-2 text-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent px-4 py-2 text-sm'
              }
              aria-pressed={effectiveTab === 'desa'}
            >
              Desa Overview
            </button>
            <button
              type='button'
              onClick={() => setTab('kelompok')}
              className={
                effectiveTab === 'kelompok'
                  ? 'border-primary border-b-2 px-4 py-2 text-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent px-4 py-2 text-sm'
              }
              aria-pressed={effectiveTab === 'kelompok'}
            >
              Per Kelompok
            </button>
          </div>
        )}

        {effectiveTab === 'desa' ? (
          <DesaOverviewTab year={year} monthKey={effectiveMonthKey} />
        ) : !resolvedKelompokId ? (
          <div className='text-muted-foreground rounded-lg border border-dashed p-10 text-center'>
            {isTeamManager ? 'Memuat kelompok...' : 'Pilih kelompok untuk mulai.'}
          </div>
        ) : isLoading ? (
          <div className='text-muted-foreground flex items-center justify-center py-16'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat data program...
          </div>
        ) : programs.length === 0 ? (
          <div className='text-muted-foreground rounded-lg border border-dashed p-10 text-center'>
            Belum ada program aktif.
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <AttendanceCharts
              year={year}
              currentMonthKey={current}
              monthlyReports={matrixData?.monthlyReports ?? []}
              metricReports={matrixData?.metricReports ?? []}
            />
            <div className='grid gap-4 xl:grid-cols-2'>
              {programs.map((p) => (
                <ProgramAnalyticsCard
                  key={p.code}
                  program={p}
                  year={year}
                  currentMonthKey={current}
                  monthlyReports={data?.monthlyReports ?? []}
                  programReports={data?.programReports ?? []}
                />
              ))}
            </div>
          </div>
        )}
      </Main>
    </>
  )
}
