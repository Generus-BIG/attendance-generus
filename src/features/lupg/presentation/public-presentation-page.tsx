import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, Presentation, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PresentationPlayer } from '../recap/presentation/player'
import {
  buildSlides,
  type PresentationData,
} from '../recap/presentation/slides'
import { formatMonthLabel } from '../utils/month-utils'

interface PublicPresentationPageProps {
  token: string
}

type PublicPresentationResponse =
  | {
      status: 'ok'
      share: {
        monthKey: string
        kelompokId: string | null
      }
      data: PresentationData
    }
  | { status: 'unavailable' }

async function fetchPublicPresentation(
  token: string
): Promise<PublicPresentationResponse> {
  if (!/^[0-9a-f]{32}$/.test(token)) return { status: 'unavailable' }

  const { data, error } = await supabase.functions.invoke(
    'lupg-public-presentation',
    { body: { token } }
  )
  if (error) throw error
  if (
    !data ||
    typeof data !== 'object' ||
    !('status' in data) ||
    (data.status !== 'ok' && data.status !== 'unavailable')
  ) {
    throw new Error('Invalid public presentation response')
  }

  return data as PublicPresentationResponse
}

export function PublicPresentationPage({ token }: PublicPresentationPageProps) {
  const query = useQuery({
    queryKey: ['public-lupg-presentation', token],
    queryFn: () => fetchPublicPresentation(token),
    retry: false,
  })
  const payload = query.data?.status === 'ok' ? query.data : null
  const slides = useMemo(
    () => (payload ? buildSlides(payload.data) : []),
    [payload]
  )

  useEffect(() => {
    if (payload) return
    const previousTitle = document.title
    document.title = query.isLoading
      ? 'Memuat Presentasi LUPG'
      : 'Presentasi LUPG'
    return () => {
      document.title = previousTitle
    }
  }, [payload, query.isLoading])

  useEffect(() => {
    if (!payload) return
    const scope =
      payload.data.kelompokList.find(
        (kelompok) => kelompok.id === payload.share.kelompokId
      )?.value ?? 'Desa Big'
    const previousTitle = document.title
    document.title = `Presentasi LUPG · ${formatMonthLabel(payload.share.monthKey)} · ${scope}`
    return () => {
      document.title = previousTitle
    }
  }, [payload])

  if (query.isLoading) {
    return <PublicPresentationState loading />
  }

  if (query.isError) {
    return (
      <PublicPresentationState
        title='Presentasi gagal dimuat'
        description='Periksa koneksi internet, lalu coba lagi.'
        action={
          <Button
            type='button'
            onClick={() => query.refetch()}
            className='min-h-11'
          >
            <RefreshCw className='mr-2 size-4' />
            Coba Lagi
          </Button>
        }
      />
    )
  }

  if (!payload) {
    return (
      <PublicPresentationState
        title='Presentasi tidak tersedia'
        description='Link mungkin dinonaktifkan, sudah diganti, atau tidak valid.'
      />
    )
  }

  return (
    <PresentationPlayer
      monthKey={payload.share.monthKey}
      slides={slides}
      isLoading={false}
    />
  )
}

function PublicPresentationState({
  loading = false,
  title,
  description,
  action,
}: {
  loading?: boolean
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <main className='flex min-h-svh items-center justify-center bg-muted/30 p-4'>
      <Card className='w-full max-w-md'>
        <CardContent className='flex flex-col items-center gap-4 px-6 py-10 text-center'>
          <div className='flex size-12 items-center justify-center rounded-full border bg-background'>
            {loading ? (
              <Loader2 className='size-6 animate-spin' />
            ) : title?.includes('tidak tersedia') ? (
              <AlertCircle className='size-6 text-muted-foreground' />
            ) : (
              <Presentation className='size-6 text-muted-foreground' />
            )}
          </div>
          <div className='space-y-2'>
            <h1 className='text-xl font-semibold text-balance'>
              {loading ? 'Memuat presentasi' : title}
            </h1>
            <p className='text-sm text-pretty text-muted-foreground'>
              {loading
                ? 'Menyiapkan data laporan dan foto terbaru.'
                : description}
            </p>
          </div>
          {action}
        </CardContent>
      </Card>
    </main>
  )
}
