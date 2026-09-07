import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PresentationPlayer } from './player'
import { loadPrivatePresentationData } from './private-presentation-data'
import { buildSlides } from './slides'

interface Props {
  monthKey: string
  kelompokFilter?: string
}

export function Presentation(props: Props) {
  const navigate = useNavigate()

  return (
    <PresentationLoader
      {...props}
      onExit={() =>
        navigate({
          to: '/admin/lupg/presentation',
          search: {
            month: props.monthKey,
            ...(props.kelompokFilter ? { kelompok: props.kelompokFilter } : {}),
          },
        })
      }
    />
  )
}

function PresentationLoader({
  monthKey,
  kelompokFilter,
  onExit,
}: Props & { onExit: () => void }) {
  const query = useQuery({
    queryKey: ['lupg', 'private-presentation', monthKey, kelompokFilter],
    queryFn: () =>
      loadPrivatePresentationData({ monthKey, kelompokId: kelompokFilter }),
  })
  const data = query.data
  const slides = useMemo(() => (data ? buildSlides(data) : []), [data])

  if (query.isError) {
    return (
      <div
        className='fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6'
        role='alert'
      >
        <p>
          Presentasi gagal dimuat. Periksa koneksi dan akses laporan, lalu coba
          lagi.
        </p>
        <div className='flex gap-2'>
          <Button onClick={() => query.refetch()} disabled={query.isFetching}>
            Coba lagi
          </Button>
          <Button variant='outline' onClick={onExit}>
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PresentationPlayer
      monthKey={monthKey}
      slides={slides}
      isLoading={query.isLoading}
      onExit={onExit}
      onExport={
        data
          ? async (palette, onProgress) => {
              const { exportPresentationPptx } =
                await import('./pptx/export-presentation-pptx')
              return exportPresentationPptx(data, { palette, onProgress })
            }
          : undefined
      }
    />
  )
}
