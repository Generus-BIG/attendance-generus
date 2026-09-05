import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Presentation, RefreshCw } from 'lucide-react'
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
      ? 'Loading LUPG presentation'
      : 'LUPG presentation'
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
    document.title = `LUPG presentation · ${formatMonthLabel(payload.share.monthKey)} · ${scope}`
    return () => {
      document.title = previousTitle
    }
  }, [payload])

  if (query.isError) {
    return (
      <PublicPresentationState
        icon={<AlertCircle className='size-6 text-muted-foreground' />}
        title='Presentasi gagal dimuat'
        description='Periksa koneksi internet, lalu coba lagi.'
        action={
          <Button
            type='button'
            onClick={() => query.refetch()}
            className='min-h-11 transition-transform duration-150 active:scale-[0.96] motion-reduce:transform-none'
          >
            <RefreshCw className='mr-2 size-4' />
            Coba Lagi
          </Button>
        }
      />
    )
  }

  if (!payload && !query.isLoading) {
    return (
      <PublicPresentationState
        icon={<Presentation className='size-6 text-muted-foreground' />}
        title='Presentasi tidak tersedia'
        description='Link mungkin dinonaktifkan, sudah diganti, atau tidak valid.'
      />
    )
  }

  return (
    <PresentationPlayer
      key={token}
      monthKey={payload?.share.monthKey ?? ''}
      slides={slides}
      isLoading={query.isLoading}
    />
  )
}

function PublicPresentationState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <main className='relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4 antialiased'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_24%,var(--accent),transparent_48%)] opacity-80'
      />
      <Card className='w-full max-w-md border-0 shadow-xl ring-1 shadow-primary/5 ring-foreground/5'>
        <CardContent className='flex flex-col items-center gap-4 px-6 py-10 text-center'>
          <div className='flex size-12 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-foreground/5'>
            {icon}
          </div>
          <div className='space-y-2'>
            <h1 className='text-xl font-semibold tracking-tight text-balance'>
              {title}
            </h1>
            <p className='text-sm text-pretty text-muted-foreground'>
              {description}
            </p>
          </div>
          {action}
        </CardContent>
      </Card>
    </main>
  )
}
