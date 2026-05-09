'use client'

import { type Participant } from '@/lib/schema'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
      title='Hapus peserta ini?'
      desc={
        <div className='space-y-3'>
          <p>
            Peserta <span className='font-semibold'>{currentRow.name}</span>{' '}
            akan dihapus. Data yang sudah dihapus tidak dapat dipulihkan.
          </p>
          <ul className='list-disc space-y-1 ps-4 text-sm text-muted-foreground'>
            <li>
              Nama: <span className='font-semibold'>{currentRow.name}</span>
            </li>
            <li>
              Kelompok:{' '}
              <span className='font-semibold'>{currentRow.kelompok}</span>
            </li>
            <li>
              Kategori:{' '}
              <span className='font-semibold'>{currentRow.kategori}</span>
            </li>
          </ul>
        </div>
      }
      cancelBtnText='Batal'
      confirmText='Hapus peserta'
      destructive
    />
  )
}
