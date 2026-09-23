import { useState } from 'react'
import { ImageOff, Images } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type DocumentationPreview } from '../../hooks/use-desa-overview'

interface Props {
  monthLabel: string
  rows: DocumentationPreview[]
  grouped?: boolean
}

export function TileDocumentation({
  monthLabel,
  rows,
  grouped = false,
}: Props) {
  const [selected, setSelected] = useState<DocumentationPreview | null>(null)

  const groupedRows = grouped
    ? (() => {
        const byKelompok = new Map<string, DocumentationPreview[]>()
        for (const photo of rows) {
          const list = byKelompok.get(photo.kelompokName)
          if (list) list.push(photo)
          else byKelompok.set(photo.kelompokName, [photo])
        }
        return [...byKelompok]
      })()
    : []

  function photoCell(photo: DocumentationPreview) {
    if (photo.signedUrl) {
      return (
        <button
          type='button'
          onClick={() => setSelected(photo)}
          className='group w-full overflow-hidden rounded-lg border bg-muted/20 text-left transition-colors outline-none hover:border-ring focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={`Lihat foto ${photo.caption || 'dokumentasi kegiatan'} dari ${photo.kelompokName}`}
        >
          <img
            src={photo.signedUrl}
            alt={photo.caption || `Dokumentasi ${photo.kelompokName}`}
            loading='lazy'
            className='aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transform-none'
          />
          {!grouped && (
            <span className='block truncate px-2.5 pt-2 text-xs font-medium'>
              {photo.kelompokName}
            </span>
          )}
          <span className='line-clamp-2 block min-h-8 px-2.5 pt-0.5 pb-2 text-xs text-muted-foreground'>
            {photo.caption || 'Tanpa keterangan'}
          </span>
        </button>
      )
    }
    return (
      <div
        role='img'
        aria-label={`Foto tidak tersedia: ${photo.caption || photo.kelompokName}`}
        className='flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 text-center text-xs text-muted-foreground'
      >
        <ImageOff className='size-5' aria-hidden='true' />
        Foto tidak tersedia
      </div>
    )
  }

  return (
    <section className='flex h-full flex-col rounded-xl border bg-card p-4 text-card-foreground sm:p-5'>
      <div className='mb-3 flex items-start justify-between gap-4'>
        <div>
          <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            Dokumentasi
          </div>
          <h3 className='mt-1 text-base font-semibold tracking-tight'>
            Dokumentasi Kegiatan
          </h3>
          <p className='mt-1 text-xs text-muted-foreground'>{monthLabel}</p>
        </div>
        <div className='inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground'>
          <Images className='size-3.5' aria-hidden='true' />
          {rows.length} foto
        </div>
      </div>

      {rows.length === 0 ? (
        <div className='flex min-h-36 flex-1 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground'>
          Belum ada dokumentasi kegiatan untuk bulan ini.
        </div>
      ) : grouped ? (
        <div className='flex max-h-96 flex-col gap-4 overflow-y-auto pr-1'>
          {groupedRows.map(([kelompokName, photos]) => (
            <section
              key={kelompokName}
              aria-label={`Dokumentasi ${kelompokName}`}
            >
              <h4 className='mb-2 flex items-baseline gap-2 text-sm font-semibold tracking-tight'>
                {kelompokName}
                <span className='text-xs font-normal text-muted-foreground'>
                  · {photos.length} foto
                </span>
              </h4>
              <ul className='grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4'>
                {photos.map((photo) => (
                  <li key={photo.id} className='min-w-0'>
                    {photoCell(photo)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className='grid max-h-96 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4'>
          {rows.map((photo) => (
            <li key={photo.id} className='min-w-0'>
              {photoCell(photo)}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className='max-h-[92dvh] overflow-y-auto sm:max-w-5xl'>
          <DialogHeader>
            <DialogTitle>
              {selected?.kelompokName ?? 'Dokumentasi kegiatan'}
            </DialogTitle>
            <DialogDescription>
              {selected?.caption || 'Tanpa keterangan'}
            </DialogDescription>
          </DialogHeader>
          {selected?.signedUrl && (
            <img
              src={selected.signedUrl}
              alt={selected.caption || `Dokumentasi ${selected.kelompokName}`}
              className='mx-auto max-h-[72dvh] w-auto max-w-full rounded-md object-contain'
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
