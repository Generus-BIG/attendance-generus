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
      <SheetContent side='right' className='w-full sm:max-w-md'>
        <SheetHeader>
          <div className='text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
            Pengajuan peserta
          </div>
          <SheetTitle>{pending?.name ?? '—'}</SheetTitle>
          <SheetDescription>
            Tinjau data lengkap sebelum menyetujui, menggabungkan, atau menolak.
          </SheetDescription>
        </SheetHeader>

        {pending && (
          <div className='flex flex-col gap-4 py-4'>
            <DetailRow label='Kelompok' value={pending.suggestedKelompok} />
            <DetailRow
              label='Kategori'
              value={`Kategori ${pending.suggestedKategori}`}
            />
            <DetailRow
              label='Jenis kelamin'
              value={pending.suggestedGender === 'L' ? 'Laki-laki' : 'Perempuan'}
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

        <SheetFooter className='flex-col gap-2 sm:flex-col sm:space-x-0'>
          <Button
            type='button'
            className='w-full'
            onClick={() => pending && onApprove(pending)}
          >
            <Check className='mr-2 h-4 w-4' />
            Setujui sebagai peserta baru
          </Button>
          <Button
            type='button'
            variant='outline'
            className='w-full'
            onClick={() => pending && onMerge(pending)}
          >
            <Merge className='mr-2 h-4 w-4' />
            Gabungkan ke peserta yang ada
          </Button>
          <Button
            type='button'
            variant='ghost'
            className='text-destructive hover:text-destructive w-full'
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
    <div className='border-border/60 grid grid-cols-[140px_1fr] items-baseline gap-3 border-b pb-3 last:border-0 last:pb-0'>
      <div className='text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
        {label}
      </div>
      <div className='text-sm font-medium'>{value}</div>
    </div>
  )
}
