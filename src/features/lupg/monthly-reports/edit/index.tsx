import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ReportStatusBadge } from '../../components/report-status-badge'
import { useMonthlyReport } from '../../hooks/use-lupg-queries'
import {
  formatMonthLabel,
  isReportMonthAvailable,
  monthKeyFromDate,
} from '../../utils/month-utils'
import { RevealOnScroll } from '../components/reveal-on-scroll'
import { SectionNav, type SectionItem } from '../components/section-nav'
import { SubmitCard } from '../components/submit-card'
import { AttendanceMatrixSection } from '../sections/attendance-matrix-section'
import { CharacterMonitoringSection } from '../sections/character-monitoring-section'
import { CharacterTargetSection } from '../sections/character-target-section'
import { DokumentasiSection } from '../sections/dokumentasi-section'
import { MustinSection } from '../sections/mustin-section'
import { ProgramTrackerSection } from '../sections/program-tracker-section'
import { SarprasSection } from '../sections/sarpras-section'
import { SensusPreviewSection } from '../sections/sensus-preview-section'
import { ShodaqohSection } from '../sections/shodaqoh-section'

interface Props {
  monthlyReportId: string
}

const SECTIONS: SectionItem[] = [
  { id: 'section-sensus', label: 'Sensus' },
  { id: 'section-attendance', label: 'Kehadiran' },
  { id: 'section-program-tracker', label: 'Program Tracker' },
  { id: 'section-sarpras', label: 'Sarpras' },
  { id: 'section-shodaqoh', label: 'Shodaqoh' },
  { id: 'section-mustin', label: 'Resume Mustin' },
  { id: 'section-character-targets', label: 'Target Capaian Materi' },
  { id: 'section-character-monitoring', label: 'Penerapan 29 Karakter' },
  { id: 'section-dokumentasi', label: 'Dokumentasi' },
]

export function MonthlyReportEdit({ monthlyReportId }: Props) {
  const { data: report, isLoading, error } = useMonthlyReport(monthlyReportId)

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

  const kelompokName = report
    ? (kelompokOptions.find((k) => k.id === report.kelompok_id)?.value ?? '—')
    : '—'

  if (isLoading) {
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
        <Main className='flex flex-1 flex-col gap-6'>
          <div className='flex items-start gap-2'>
            <Skeleton className='h-11 w-11 rounded-md' />
            <div className='flex flex-col gap-2'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='h-8 w-64' />
              <Skeleton className='h-4 w-48' />
            </div>
          </div>
          <div className='grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]'>
            <div className='hidden flex-col gap-2 lg:flex'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='h-9 w-full' />
              ))}
            </div>
            <div className='flex flex-col gap-8'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='flex flex-col gap-3'>
                  <Skeleton className='h-3 w-32' />
                  <Skeleton className='h-6 w-48' />
                  <Skeleton className='h-32 w-full' />
                </div>
              ))}
            </div>
          </div>
        </Main>
      </>
    )
  }

  if (error || !report) {
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
        <Main className='flex flex-1 flex-col items-center justify-center gap-4'>
          <p className='text-muted-foreground'>
            Laporan tidak ditemukan atau Anda tidak memiliki akses.
          </p>
          <Link to='/admin/lupg/reports'>
            <Button variant='outline'>Kembali ke daftar</Button>
          </Link>
        </Main>
      </>
    )
  }

  // Locked is now only true for legacy rows that were auto-locked before the
  // 'Tandai Selesai' flow was introduced; new reports stay editable after Done.
  const readOnly = report.locked || !isReportMonthAvailable(monthKeyFromDate(report.month))

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
      <Main className='flex min-w-0 flex-1 flex-col gap-4 overflow-x-clip sm:gap-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <div className='flex min-w-0 items-start gap-2'>
            <Link
              to='/admin/lupg/reports'
              aria-label='Kembali ke daftar laporan'
            >
              <Button variant='ghost' size='icon' className='h-11 w-11'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
            </Link>
            <div className='flex min-w-0 flex-col gap-1 pt-1'>
              <span className='text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase'>
                Laporan Bulanan
              </span>
              <h2 className='text-2xl font-semibold tracking-tight wrap-break-word whitespace-normal text-foreground sm:text-[2rem]'>
                {kelompokName} ·{' '}
                {formatMonthLabel(monthKeyFromDate(report.month))}
              </h2>
              <p className='max-w-[65ch] text-sm text-muted-foreground'>
                Isi setiap bagian. Tandai selesai di bawah saat sudah lengkap.
              </p>
              <div className='pt-1 sm:hidden'>
                <ReportStatusBadge
                  status={report.status as 'draft' | 'submitted'}
                  locked={report.locked}
                />
              </div>
            </div>
          </div>
          <div className='hidden sm:block'>
            <ReportStatusBadge
              status={report.status as 'draft' | 'submitted'}
              locked={report.locked}
            />
          </div>
        </div>

        <div className='grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]'>
          <SectionNav sections={SECTIONS} />

          <div className='flex min-w-0 flex-col gap-6 sm:gap-8 lg:gap-12'>
            <RevealOnScroll>
              <SensusPreviewSection report={report} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={50}>
              <AttendanceMatrixSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={100}>
              <ProgramTrackerSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={150}>
              <SarprasSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={200}>
              <ShodaqohSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={250}>
              <MustinSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={300}>
              <CharacterTargetSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={350}>
              <CharacterMonitoringSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
            <RevealOnScroll delayMs={400}>
              <DokumentasiSection report={report} readOnly={readOnly} />
            </RevealOnScroll>
          </div>
        </div>

        <SubmitCard report={report} />
      </Main>
    </>
  )
}
