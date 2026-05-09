import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Check, Merge, X } from 'lucide-react'
import { type PendingParticipant } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatKategoriLabel } from '../approval-utils'

interface Props {
  pending: PendingParticipant | null
  onClose: () => void
  onApprove: (p: PendingParticipant) => void
  onMerge: (p: PendingParticipant) => void
  onReject: (p: PendingParticipant) => void
}

export function PendingReviewDrawer({
  pending,
  onClose,
  onApprove,
  onMerge,
  onReject,
}: Props) {
  return (
    <Sheet open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 p-0 sm:max-w-lg'
      >
        <SheetHeader className='border-b border-border/70 px-6 py-5 text-left'>
          <div className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
            Pengajuan peserta
          </div>
          <SheetTitle className='text-xl'>{pending?.name ?? '—'}</SheetTitle>
          <SheetDescription className='max-w-[42ch]'>
            Tinjau data lengkap sebelum menyetujui, menggabungkan, atau menolak.
          </SheetDescription>
        </SheetHeader>

        {pending && (
          <div className='flex-1 overflow-y-auto px-6 py-2'>
            <DetailRow label='Kelompok' value={pending.suggestedKelompok} />
            <DetailRow
              label='Kategori'
              value={formatKategoriLabel(pending.suggestedKategori)}
            />
            <DetailRow
              label='Jenis kelamin'
              value={
                pending.suggestedGender === 'L' ? 'Laki-laki' : 'Perempuan'
              }
            />
            <DetailRow
              label='Tanggal lahir'
              value={
                pending.birthDate
                  ? format(pending.birthDate, 'dd MMM yyyy', {
                      locale: idLocale,
                    })
                  : '—'
              }
            />
            <DetailRow label='Tempat lahir' value={pending.birthPlace ?? '—'} />
            <DetailRow
              label='Jumlah absensi terhubung'
              value={`${pending.attendanceRefIds.length} entri`}
            />
            <DetailRow
              label='Diajukan'
              value={format(pending.createdAt, 'dd MMM yyyy, HH:mm', {
                locale: idLocale,
              })}
            />
          </div>
        )}

        <SheetFooter className='mt-auto flex-col gap-2 border-t border-border/70 px-6 py-5 sm:flex-col sm:space-x-0'>
          <Button
            type='button'
            className='min-h-11 w-full'
            onClick={() => pending && onApprove(pending)}
          >
            <Check className='mr-2 h-4 w-4' />
            Setujui sebagai peserta baru
          </Button>
          <Button
            type='button'
            variant='outline'
            className='min-h-11 w-full'
            onClick={() => pending && onMerge(pending)}
          >
            <Merge className='mr-2 h-4 w-4' />
            Gabungkan ke peserta yang ada
          </Button>
          <Button
            type='button'
            variant='ghost'
            className='min-h-11 w-full text-destructive hover:text-destructive'
            onClick={() => pending && onReject(pending)}
          >
            <X className='mr-2 h-4 w-4' />
            Tolak pengajuan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='grid gap-1 border-b border-border/60 py-4 last:border-0 sm:grid-cols-[160px_1fr] sm:gap-4'>
      <div className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
        {label}
      </div>
      <div className='text-sm leading-6 font-medium'>{value}</div>
    </div>
  )
}
