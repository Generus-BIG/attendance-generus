'use client'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Participant } from '@/lib/schema'
import { useParticipantsCRUD } from '../context/participants-context'

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
  const { deleteParticipant } = useParticipantsCRUD()

  const handleDelete = async () => {
    try {
      await deleteParticipant(currentRow.id)
      onOpenChange(false)
    } catch {
      // Error is already handled by the mutation's onError
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
