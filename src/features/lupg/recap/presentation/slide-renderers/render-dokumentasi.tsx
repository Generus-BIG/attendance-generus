// Renderer for activity documentation photos slide.
// Displays photos in a 1 or 2 photo layout optimized for projector/presentation.
import { AnimateItem } from '../components/animate-element'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette } from '../use-pres-palette'

export interface ActivityPhotoWithUrl {
  id: string
  caption: string | null
  signedUrl: string
  kelompokName?: string
}

interface DokumentasiSlideArgs {
  monthLabel: string
  scope: string
  photos: ActivityPhotoWithUrl[]
  slideNumber: number
  totalSlides: number
}

const PHOTOS_PER_SLIDE = 2

function DokumentasiMeta({
  monthLabel,
  kelompokName,
}: {
  monthLabel: string
  kelompokName?: string
}) {
  const p = usePresPalette()

  return (
    <div className='flex flex-col items-end gap-1'>
      <div>{monthLabel}</div>
      {kelompokName && (
        <div
          style={{
            fontSize: '0.68em',
            letterSpacing: '0.14em',
            opacity: 0.65,
            color: p.muted,
          }}
        >
          {kelompokName}
        </div>
      )}
    </div>
  )
}

function DokumentasiGrid({ photos }: { photos: ActivityPhotoWithUrl[] }) {
  const p = usePresPalette()

  if (photos.length === 1) {
    const photo = photos[0]
    return (
      <div className='mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-3'>
        <AnimateItem className='flex h-full w-full flex-1 items-center justify-center'>
          <img
            src={photo.signedUrl}
            alt={photo.caption ?? ''}
            className='max-h-[60vh] max-w-full object-contain'
          />
        </AnimateItem>
        {photo.caption && (
          <AnimateItem
            className='px-3 text-center'
            style={{
              fontFamily: p.fontSans,
              fontSize: 'clamp(0.9rem, 1.2vw, 1.25rem)',
              color: p.muted,
              fontWeight: 500,
            }}
          >
            {photo.caption}
          </AnimateItem>
        )}
      </div>
    )
  }

  return (
    <div className='grid h-full grid-cols-2 gap-6'>
      {photos.map((photo) => (
        <AnimateItem key={photo.id} className='flex h-full flex-col gap-3'>
          <div className='flex h-full w-full flex-1 items-center justify-center overflow-hidden'>
            <img
              src={photo.signedUrl}
              alt={photo.caption ?? ''}
              className='max-h-[55vh] max-w-full object-contain'
            />
          </div>
          {photo.caption && (
            <p
              className='line-clamp-2 px-3 text-center'
              style={{
                fontFamily: p.fontSans,
                fontSize: 'clamp(0.8rem, 1.1vw, 1.125rem)',
                color: p.muted,
              }}
            >
              {photo.caption}
            </p>
          )}
        </AnimateItem>
      ))}
    </div>
  )
}

export function renderDokumentasiSlides(args: DokumentasiSlideArgs): Slide[] {
  const { monthLabel, scope, photos, slideNumber, totalSlides } = args

  if (photos.length === 0) return []

  // Chunk into groups of PHOTOS_PER_SLIDE (2)
  const chunks: ActivityPhotoWithUrl[][] = []
  for (let i = 0; i < photos.length; i += PHOTOS_PER_SLIDE) {
    chunks.push(photos.slice(i, i + PHOTOS_PER_SLIDE))
  }

  return chunks.map((chunk, chunkIdx) => ({
    key: `dokumentasi-${chunkIdx}`,
    title: `Dokumentasi${chunks.length > 1 ? ` (${chunkIdx + 1}/${chunks.length})` : ''}`,
    render: () => (
      <SlideFrame
        eyebrow='Dokumentasi'
        title='Dokumentasi Kegiatan'
        meta={
          <DokumentasiMeta
            monthLabel={monthLabel}
            kelompokName={[
              ...new Set(
                chunk
                  .map((photo) => photo.kelompokName)
                  .filter((name): name is string => Boolean(name))
              ),
            ].join(' · ')}
          />
        }
        scope={scope}
        slideNumber={slideNumber + chunkIdx}
        totalSlides={totalSlides}
      >
        <DokumentasiGrid photos={chunk} />
      </SlideFrame>
    ),
  }))
}
