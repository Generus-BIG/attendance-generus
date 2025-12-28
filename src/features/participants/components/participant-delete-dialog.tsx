'use client'

import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Participant } from '@/lib/schema'
import { participantService } from '../services'
import { useParticipants } from './participants-provider'

type ParticipantDeleteDialogProps = {
  currentRow: Participant
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ParticipantDeleteDialog({
  currentRow,
  open,
  onOpenChange,
}: ParticipantDeleteDialogProps) {
  const { refreshData } = useParticipants()

  const handleDelete = async () => {
    try {
      await participantService.delete(currentRow.id)
      toast.success('Peserta berhasil dihapus')
      refreshData()
      onOpenChange(false)
    } catch {
      toast.error('Gagal menghapus peserta')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      title={
        <span className='text-destructive'>
          Hapus Peserta{' '}
          <span className='text-primary font-semibold'>{currentRow.name}</span>?
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Anda yakin ingin menghapus peserta ini? Data yang sudah dihapus tidak dapat
            dikembalikan.
          </p>
          <ul className='text-muted-foreground list-disc ps-4 text-sm'>
            <li>
              Nama: <span className='font-semibold'>{currentRow.name}</span>
            </li>
            <li>
              Kelompok: <span className='font-semibold'>{currentRow.kelompok}</span>
            </li>
            <li>
              Kategori: <span className='font-semibold'>{currentRow.kategori}</span>
            </li>
          </ul>
        </div>
      }
      confirmText='Hapus'
      destructive
    />
  )
}
