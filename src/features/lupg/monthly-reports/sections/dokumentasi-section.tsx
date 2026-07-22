import { useCallback, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  useActivityPhotos,
  useActivityPhotoSignedUrls,
  useUploadActivityPhoto,
  useUpdatePhotoCaption,
  useDeleteActivityPhoto,
  useDeleteActivityPhotos,
  useReorderActivityPhotos,
} from '../../hooks/use-lupg-queries'
import { type ActivityPhotoRow, type MonthlyReportRow } from '../../types'
import {
  compressImage,
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTOS_PER_REPORT,
} from '../../utils/image-compression'
import { monthKeyFromDate } from '../../utils/month-utils'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function DokumentasiSection({ report, readOnly }: Props) {
  const { data: photos = [] } = useActivityPhotos(report.id)
  const { data: signedUrlMap } = useActivityPhotoSignedUrls(report.id, photos)
  const uploadMutation = useUploadActivityPhoto()
  const captionMutation = useUpdatePhotoCaption()
  const deleteMutation = useDeleteActivityPhoto()
  const deletePhotosMutation = useDeleteActivityPhotos()
  const reorderMutation = useReorderActivityPhotos()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [compressProgress, setCompressProgress] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ActivityPhotoRow | null>(
    null
  )

  // Multi-delete states derived from selectedIds
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteMultipleTarget, setDeleteMultipleTarget] = useState(false)
  const isSelectMode = selectedIds.length > 0

  // Drag and Drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const canUpload = !readOnly && photos.length < MAX_PHOTOS_PER_REPORT

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const remaining = MAX_PHOTOS_PER_REPORT - photos.length
      const toUpload = Array.from(files).slice(0, remaining)

      setUploading(true)
      let successCount = 0

      for (const rawFile of toUpload) {
        try {
          setCompressProgress(0)
          const compressed = await compressImage(rawFile, setCompressProgress)
          await uploadMutation.mutateAsync({
            reportId: report.id,
            kelompokId: report.kelompok_id,
            monthKey: monthKeyFromDate(report.month),
            file: compressed,
            sortOrder: photos.length + successCount,
          })
          successCount++
        } catch (e) {
          toast.error(
            `Gagal upload ${rawFile.name}: ${e instanceof Error ? e.message : 'Unknown error'}`
          )
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} foto berhasil diupload`)
      }
      setUploading(false)
      setCompressProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [photos.length, report.id, report.kelompok_id, report.month, uploadMutation]
  )

  const handleDropUpload = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!canUpload) return
      handleFiles(e.dataTransfer.files)
    },
    [canUpload, handleFiles]
  )

  const handleCaptionBlur = (photo: ActivityPhotoRow, value: string) => {
    const newCaption = value.trim() || null
    if (newCaption === (photo.caption ?? null)) return
    captionMutation.mutate(
      { id: photo.id, caption: newCaption, reportId: report.id },
      {
        onError: (e: unknown) => {
          toast.error(
            e instanceof Error ? e.message : 'Gagal menyimpan caption'
          )
        },
      }
    )
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(
      {
        id: deleteTarget.id,
        storagePath: deleteTarget.storage_path,
        reportId: report.id,
      },
      {
        onSuccess: () => toast.success('Foto dihapus'),
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : 'Gagal menghapus foto'),
      }
    )
    setDeleteTarget(null)
  }

  const handleBulkDelete = () => {
    const selectedPhotos = photos.filter((p) => selectedIds.includes(p.id))
    const storagePaths = selectedPhotos.map((p) => p.storage_path)

    deletePhotosMutation.mutate(
      {
        ids: selectedIds,
        storagePaths,
        reportId: report.id,
      },
      {
        onSuccess: () => {
          toast.success(`${selectedIds.length} foto berhasil dihapus`)
          setSelectedIds([])
        },
        onError: (err: unknown) => {
          toast.error(
            err instanceof Error ? err.message : 'Gagal menghapus foto'
          )
        },
      }
    )
    setDeleteMultipleTarget(false)
  }

  const toggleSelectPhoto = (photoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    )
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly || isSelectMode) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', String(index))
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDragDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    const sourceIdx = Number(e.dataTransfer.getData('text/plain'))
    setDraggedIndex(null)
    setDragOverIndex(null)
    if (sourceIdx === targetIndex) return

    const reordered = [...photos]
    const [removed] = reordered.splice(sourceIdx, 1)
    reordered.splice(targetIndex, 0, removed)

    const updates = reordered.map((photo, i) => ({
      id: photo.id,
      sort_order: i,
    }))

    reorderMutation.mutate(
      { updates, reportId: report.id },
      {
        onError: (err: unknown) => {
          toast.error(
            err instanceof Error ? err.message : 'Gagal mengatur ulang urutan'
          )
        },
      }
    )
  }

  const getUrl = (path: string) => signedUrlMap?.get(path) ?? ''

  return (
    <>
      <section
        id='section-dokumentasi'
        className='flex scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6'
      >
        <SectionHeading
          kicker='Dokumentasi Kegiatan'
          description={`Upload foto dokumentasi kegiatan bulan ini (maks ${MAX_PHOTOS_PER_REPORT} foto).`}
          action={
            !readOnly && isSelectMode ? (
              <div className='flex animate-in items-center gap-2 duration-200 fade-in slide-in-from-top-1'>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => setDeleteMultipleTarget(true)}
                >
                  Hapus Terpilih ({selectedIds.length})
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setSelectedIds([])}
                >
                  Batal
                </Button>
              </div>
            ) : undefined
          }
        />

        {/* Upload zone */}
        {canUpload && !isSelectMode && (
          <div
            onDrop={handleDropUpload}
            onDragOver={(e) => e.preventDefault()}
            className='flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50'
          >
            {uploading ? (
              <div className='flex flex-col items-center gap-2'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                <p className='text-sm text-muted-foreground'>
                  Mengompres & mengupload...{' '}
                  {compressProgress > 0 && `${compressProgress}%`}
                </p>
              </div>
            ) : (
              <>
                <ImagePlus className='h-8 w-8 text-muted-foreground/60' />
                <p className='text-sm text-muted-foreground'>
                  Drag & drop foto atau{' '}
                  <button
                    type='button'
                    className='min-h-10 font-medium text-primary underline-offset-4 hover:underline'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    pilih file
                  </button>
                </p>
                <p className='text-xs text-muted-foreground/60'>
                  {photos.length}/{MAX_PHOTOS_PER_REPORT} foto
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type='file'
              accept={ACCEPTED_IMAGE_TYPES}
              multiple
              className='hidden'
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
          </div>
        )}

        {/* Gallery grid */}
        {photos.length > 0 && (
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {photos.map((photo, i) => {
              const isSelected = selectedIds.includes(photo.id)
              const isDragging = i === draggedIndex
              const isDragOver = i === dragOverIndex

              return (
                <div
                  key={photo.id}
                  draggable={!readOnly && !isSelectMode}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDragDrop(e, i)}
                  onDragEnd={() => {
                    setDraggedIndex(null)
                    setDragOverIndex(null)
                  }}
                  className={cn(
                    'group relative flex flex-col gap-2 rounded-lg border bg-muted/30 p-2 transition-[border-color,background-color,opacity,transform] duration-150',
                    isDragging &&
                      'scale-95 border-dashed border-primary/40 opacity-40',
                    isDragOver && 'scale-[1.02] border-primary bg-primary/5',
                    isSelectMode
                      ? 'cursor-pointer border-primary/20 hover:border-primary/50'
                      : !readOnly && 'cursor-move'
                  )}
                  onClick={() => {
                    if (isSelectMode) toggleSelectPhoto(photo.id)
                  }}
                >
                  <button
                    type='button'
                    disabled={isSelectMode}
                    className='min-h-10 cursor-pointer overflow-hidden rounded-md outline outline-black/10 dark:outline-white/10'
                    onClick={(e) => {
                      if (!isSelectMode) {
                        e.stopPropagation()
                        setLightboxIndex(i)
                      }
                    }}
                  >
                    <img
                      src={getUrl(photo.storage_path)}
                      alt={photo.caption ?? `Foto ${i + 1}`}
                      className='pointer-events-none aspect-4/3 w-full object-cover'
                      loading='lazy'
                    />
                  </button>

                  {/* Multi-select checkbox: shows on hover, or permanently if selected */}
                  {!readOnly && (
                    <div
                      className={cn(
                        'absolute top-3 left-3 z-10 flex size-10 items-center justify-center rounded-md border bg-background shadow-md transition-opacity duration-150',
                        isSelected
                          ? 'opacity-100'
                          : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type='checkbox'
                        checked={isSelected}
                        onChange={() => toggleSelectPhoto(photo.id)}
                        className='size-5 cursor-pointer accent-primary'
                      />
                    </div>
                  )}

                  {readOnly ? (
                    photo.caption && (
                      <p className='line-clamp-2 text-xs text-muted-foreground'>
                        {photo.caption}
                      </p>
                    )
                  ) : (
                    <Input
                      placeholder='Tambah keterangan...'
                      defaultValue={photo.caption ?? ''}
                      key={`${photo.id}-${photo.caption}`}
                      onBlur={(e) => handleCaptionBlur(photo, e.target.value)}
                      disabled={isSelectMode}
                      className='h-7 text-xs'
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {!readOnly && !isSelectMode && (
                    <Button
                      variant='destructive'
                      size='icon'
                      className='absolute top-3 right-3 size-10 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100'
                      aria-label='Hapus foto'
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(photo)
                      }}
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {photos.length === 0 && readOnly && (
          <p className='py-6 text-center text-sm text-muted-foreground'>
            Belum ada foto dokumentasi.
          </p>
        )}
      </section>

      {/* Lightbox */}
      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null)
        }}
      >
        <DialogContent className='max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl border-none bg-black/95 p-0 [&>button]:hidden'>
          <DialogTitle className='sr-only'>
            Pratinjau foto dokumentasi
          </DialogTitle>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <div className='relative flex h-[min(80dvh,48rem)] items-center justify-center px-[max(0.5rem,env(safe-area-inset-left))] py-[max(0.5rem,env(safe-area-inset-top))]'>
              <img
                src={getUrl(photos[lightboxIndex].storage_path)}
                alt={photos[lightboxIndex].caption ?? ''}
                className='max-h-full max-w-full object-contain'
              />

              {/* Close */}
              <Button
                variant='ghost'
                size='icon'
                className='absolute top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))] size-11 text-white hover:bg-white/20'
                onClick={() => setLightboxIndex(null)}
                aria-label='Tutup pratinjau'
              >
                <X className='h-5 w-5' />
              </Button>

              {/* Prev */}
              {lightboxIndex > 0 && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1/2 left-[max(0.5rem,env(safe-area-inset-left))] size-11 -translate-y-1/2 text-white hover:bg-white/20'
                  onClick={() => setLightboxIndex((prev) => (prev ?? 1) - 1)}
                  aria-label='Foto sebelumnya'
                >
                  <ChevronLeft className='h-6 w-6' />
                </Button>
              )}

              {/* Next */}
              {lightboxIndex < photos.length - 1 && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1/2 right-[max(0.5rem,env(safe-area-inset-right))] size-11 -translate-y-1/2 text-white hover:bg-white/20'
                  onClick={() => setLightboxIndex((prev) => (prev ?? 0) + 1)}
                  aria-label='Foto berikutnya'
                >
                  <ChevronRight className='h-6 w-6' />
                </Button>
              )}

              {/* Caption overlay */}
              {photos[lightboxIndex].caption && (
                <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 pt-8 pb-4'>
                  <p className='text-center text-sm text-white/90'>
                    {photos[lightboxIndex].caption}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Foto ini akan dihapus secara permanen dan tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete confirmation */}
      <AlertDialog
        open={deleteMultipleTarget}
        onOpenChange={setDeleteMultipleTarget}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus foto terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Sebanyak {selectedIds.length} foto terpilih akan dihapus secara
              permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
