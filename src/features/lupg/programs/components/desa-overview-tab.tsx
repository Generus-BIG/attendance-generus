import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useDesaOverview } from '../hooks/use-desa-overview'
import { DesaOverviewDashboard } from './desa-overview/desa-overview-dashboard'
import { ProgramAnalyticsShareCard } from './program-analytics-share-card'

interface Props {
  year: number
  monthKey: string
}

export function DesaOverviewTab({ year, monthKey }: Props) {
  const role = useAuthStore((state) => state.auth.role)
  const { data, isLoading, error } = useDesaOverview(year, monthKey)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16 text-muted-foreground'>
        <Loader2 className='mr-2 h-5 w-5 animate-spin' />
        Memuat data desa overview...
      </div>
    )
  }

  if (error || !data) {
    // Supabase throws PostgrestError (plain object with .message), not `Error` instance —
    // check for .message directly so we surface the real failure reason.
    const msg =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Tidak diketahui'
    return (
      <div className='rounded-lg border border-dashed p-10 text-center text-destructive'>
        Gagal memuat data: {msg}
      </div>
    )
  }

  const canShare = role === 'super_admin' || role === 'admin'
  return (
    <DesaOverviewDashboard
      data={data}
      year={year}
      monthKey={monthKey}
      shareAction={
        canShare ? <ProgramAnalyticsShareCard monthKey={monthKey} /> : undefined
      }
    />
  )
}
