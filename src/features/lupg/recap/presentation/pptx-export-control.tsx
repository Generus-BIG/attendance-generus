import { useId, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { type Palette, usePalette } from '@/context/palette-provider'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type CaptureProgress } from './pptx/capture-slides'

export type PptxExportHandler = (
  palette: Palette,
  onProgress?: (progress: CaptureProgress) => void
) => Promise<{ warnings: string[] }>

interface Props {
  onExport: PptxExportHandler
  disabled?: boolean
  compact?: boolean
}

export function PptxExportControl({
  onExport,
  disabled = false,
  compact = false,
}: Props) {
  const { palette } = usePalette()
  const [selectedPalette, setSelectedPalette] = useState<Palette>()
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState<CaptureProgress>()
  const pendingRef = useRef(false)
  const labelId = useId()

  const download = async () => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setProgress(undefined)
    try {
      const { warnings } = await onExport(
        selectedPalette ?? palette,
        setProgress
      )
      if (warnings.length) {
        toast.warning(
          `PPTX berhasil diunduh dengan ${warnings.length} peringatan.`,
          {
            description:
              'Sebagian foto tidak tersedia. Periksa placeholder foto di PowerPoint.',
          }
        )
      } else {
        toast.success('PPTX berhasil diunduh.')
      }
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : error &&
              typeof error === 'object' &&
              'message' in error &&
              typeof error.message === 'string'
            ? error.message
            : error &&
                typeof error === 'object' &&
                'type' in error &&
                error.type === 'error'
              ? 'Render gambar slide gagal di browser.'
              : String(error) ||
                'Periksa koneksi dan akses laporan, lalu coba lagi. Jika tetap gagal, hubungi administrator.'
      toast.error('PPTX gagal diunduh.', {
        description,
      })
    } finally {
      pendingRef.current = false
      setPending(false)
      setProgress(undefined)
    }
  }

  const choices = (
    <div
      className='flex flex-col items-start gap-3'
      data-presentation-no-navigation
    >
      <span id={labelId} className='text-sm font-medium'>
        Tema PPTX
      </span>
      <p className='text-xs text-muted-foreground'>
        Tampilan slide sebagai gambar; teks dan chart tidak dapat diedit.
      </p>
      <ToggleGroup
        type='single'
        variant='outline'
        aria-labelledby={labelId}
        value={selectedPalette ?? palette}
        disabled={disabled || pending}
        onValueChange={(value) => {
          if (
            value === 'modern-natural' ||
            value === 'anthropic-claude' ||
            value === 'sage-green'
          )
            setSelectedPalette(value)
        }}
      >
        <ToggleGroupItem value='modern-natural'>Modern</ToggleGroupItem>
        <ToggleGroupItem value='anthropic-claude'>Claude</ToggleGroupItem>
        <ToggleGroupItem value='sage-green'>Sage Green</ToggleGroupItem>
      </ToggleGroup>
      <Button
        type='button'
        variant='outline'
        disabled={disabled || pending}
        aria-busy={pending}
        onClick={download}
      >
        {pending ? (
          <Loader2 data-icon='inline-start' className='animate-spin' />
        ) : (
          <Download data-icon='inline-start' />
        )}
        {pending ? 'Menyiapkan PPTX…' : 'Download PPTX'}
      </Button>
      {pending && (
        <p
          role='status'
          aria-live='polite'
          className='text-xs text-muted-foreground'
        >
          {progress
            ? `${progress.phase === 'layout' ? 'Mengatur halaman' : 'Menangkap slide'} ${progress.completed}/${progress.total}`
            : 'Memuat data dan foto…'}
        </p>
      )}
    </div>
  )

  if (!compact) return choices

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          aria-label='Download PPTX'
          aria-busy={pending}
          className='min-h-11 min-w-11 sm:min-w-0'
        >
          {pending ? (
            <Loader2 className='h-4 w-4 animate-spin sm:mr-2' />
          ) : (
            <Download className='h-4 w-4 sm:mr-2' />
          )}
          <span className='hidden sm:inline'>
            {pending ? 'Menyiapkan PPTX…' : 'Download PPTX'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        container={
          typeof document === 'undefined'
            ? undefined
            : document.fullscreenElement
        }
        aria-label='Download PPTX'
        data-presentation-no-navigation
      >
        {choices}
      </PopoverContent>
    </Popover>
  )
}
