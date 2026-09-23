import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPickerSelect } from '../components/month-picker-select'
import { formatMonthLabel } from '../utils/month-utils'
import { DesaOverviewDashboard } from './components/desa-overview/desa-overview-dashboard'
import { mapPublicAnalyticsPayload } from './utils/public-analytics-payload'

interface PublicAnalyticsPageProps {
  token: string
  month?: string
}

async function fetchPayload(token: string, month?: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null
  const { data, error } = await supabase.functions.invoke(
    'lupg-public-program-analytics',
    { body: month ? { token, month } : { token } }
  )
  if (error) throw error
  return mapPublicAnalyticsPayload(data)
}

export function PublicAnalyticsPage({
  token,
  month,
}: PublicAnalyticsPageProps) {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['public-lupg-program-analytics', token, month],
    queryFn: () => fetchPayload(token, month),
    retry: false,
    staleTime: 45 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
  })
  const result = query.data ?? null
  const data = result?.data ?? null

  useEffect(() => {
    const previousTitle = document.title
    document.title = data
      ? `Program Analytics · ${formatMonthLabel(data.monthKey)} · Desa`
      : 'Program Analytics Desa'
    return () => {
      document.title = previousTitle
    }
  }, [data])

  useEffect(() => {
    if (!result || !data) return
    if (
      month !== data.monthKey &&
      (month == null || !result.availableMonthKeys.includes(month))
    ) {
      navigate({
        to: '/share/lupg/program-analytics/$token',
        params: { token },
        search: { month: data.monthKey },
        replace: true,
      })
    }
  }, [result, data, month, navigate, token])

  if (query.isLoading) return null
  if (query.isError) {
    return (
      <PublicState
        icon={<AlertCircle className='size-6 text-muted-foreground' />}
        title='Overview gagal dimuat'
        description='Periksa koneksi internet, lalu coba lagi.'
        action={
          <Button type='button' onClick={() => query.refetch()}>
            <RefreshCw className='mr-2 size-4' />
            Coba lagi
          </Button>
        }
      />
    )
  }
  if (!data || !result) {
    return (
      <PublicState
        icon={<BarChart3 className='size-6 text-muted-foreground' />}
        title='Link tidak tersedia'
        description='Link mungkin dinonaktifkan, sudah diganti, atau tidak valid.'
      />
    )
  }
  return (
    <main className='min-h-dvh bg-background px-3 py-5 text-foreground sm:px-6 sm:py-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-3 flex items-center justify-end'>
          <MonthPickerSelect
            value={data.monthKey}
            availableKeys={result.availableMonthKeys}
            onChange={(monthKey) =>
              navigate({
                to: '/share/lupg/program-analytics/$token',
                params: { token },
                search: { month: monthKey },
                replace: true,
              })
            }
          />
        </div>
        <DesaOverviewDashboard
          data={data}
          year={data.year}
          monthKey={data.monthKey}
          readOnly
        />
        <p className='mt-5 text-center text-xs text-muted-foreground'>
          Laporan bulanan menampilkan data yang sudah dikirim. Sensus adalah
          ringkasan desa terkini.
        </p>
      </div>
    </main>
  )
}

function PublicState({
  icon = <BarChart3 className='size-6 text-muted-foreground' />,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <main className='flex min-h-dvh items-center justify-center bg-background p-4'>
      <Card className='w-full max-w-md'>
        <CardContent className='flex flex-col items-center gap-4 px-6 py-10 text-center'>
          <div className='flex size-12 items-center justify-center rounded-2xl border bg-muted/40'>
            {icon}
          </div>
          <div className='space-y-2'>
            <h1 className='text-xl font-semibold tracking-tight'>{title}</h1>
            <p className='text-sm text-muted-foreground'>{description}</p>
          </div>
          {action}
        </CardContent>
      </Card>
    </main>
  )
}
