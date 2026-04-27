import { Loader2, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { useMonthlyReport } from '../../hooks/use-lupg-queries'
import {
  formatMonthLabel,
  monthKeyFromDate,
} from '../../utils/month-utils'
import { SubmitCard } from '../components/submit-card'
import { SensusPreviewSection } from '../sections/sensus-preview-section'
import { AttendanceMatrixSection } from '../sections/attendance-matrix-section'
import { ProgramTrackerSection } from '../sections/program-tracker-section'
import { SarprasSection } from '../sections/sarpras-section'
import { ShodaqohSection } from '../sections/shodaqoh-section'
import { MustinSection } from '../sections/mustin-section'

interface Props {
  monthlyReportId: string
}

export function MonthlyReportEdit({ monthlyReportId }: Props) {
  const { data: report, isLoading, error } = useMonthlyReport(monthlyReportId)

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
        <Main className='flex flex-1 items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
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

  const readOnly = report.locked

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
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2'>
            <Link to='/admin/lupg/reports'>
              <Button variant='ghost' size='icon' className='h-8 w-8'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
            </Link>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                Laporan {formatMonthLabel(monthKeyFromDate(report.month))}
              </h2>
              <p className='text-sm text-muted-foreground'>
                Isi setiap section, lalu submit di akhir.
              </p>
            </div>
          </div>
        </div>

        <SubmitCard report={report} />

        <div className='flex flex-col gap-4'>
          <SensusPreviewSection report={report} />
          <AttendanceMatrixSection report={report} readOnly={readOnly} />
          <ProgramTrackerSection report={report} readOnly={readOnly} />
          <SarprasSection report={report} readOnly={readOnly} />
          <ShodaqohSection report={report} readOnly={readOnly} />
          <MustinSection report={report} readOnly={readOnly} />
        </div>
      </Main>
    </>
  )
}
