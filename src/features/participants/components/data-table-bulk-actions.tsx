import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { UserMinus, UserCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { type Participant } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useParticipantsCRUD } from '../context/participants-context'

type DataTableBulkActionsProps = {
  table: Table<Participant>
}

export function DataTableBulkActions({ table }: DataTableBulkActionsProps) {
  const { updateParticipant, deleteParticipants } = useParticipantsCRUD()
  const selectedRows = table.getSelectedRowModel().rows
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!selectedRows.length) return null

  const handleDeactivate = async () => {
    const updates = selectedRows.map((row) =>
      updateParticipant(row.original.id, { status: 'inactive' })
    )
    try {
      await Promise.all(updates)
      toast.success(`${selectedRows.length} peserta berhasil dinonaktifkan`)
      table.resetRowSelection()
    } catch {
      // Errors handled by mutation onError
    }
  }

  const handleActivate = async () => {
    const updates = selectedRows.map((row) =>
      updateParticipant(row.original.id, { status: 'active' })
    )
    try {
      await Promise.all(updates)
      toast.success(`${selectedRows.length} peserta berhasil diaktifkan`)
      table.resetRowSelection()
    } catch {
      // Errors handled by mutation onError
    }
  }

  const handleDelete = async () => {
    const ids = selectedRows.map((row) => row.original.id)
    try {
      await deleteParticipants(ids)
      table.resetRowSelection()
      setDeleteOpen(false)
    } catch {
      // Error handled by mutation onError
    }
  }

  return (
    <div className='flex w-full flex-col gap-2 sm:flex-row sm:items-center'>
      <span className='text-sm text-muted-foreground sm:me-1'>
        {selectedRows.length} peserta dipilih
      </span>
      <div className='flex flex-wrap gap-2'>
        <Button
          variant='outline'
          size='sm'
          className='flex-1 sm:flex-none'
          onClick={handleActivate}
        >
          <UserCheck className='mr-2 h-4 w-4' />
          Aktifkan
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='flex-1 sm:flex-none'
          onClick={handleDeactivate}
        >
          <UserMinus className='mr-2 h-4 w-4' />
          Nonaktifkan
        </Button>
        <Button
          variant='destructive'
          size='sm'
          className='flex-1 sm:flex-none'
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Hapus
        </Button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Hapus ${selectedRows.length} peserta?`}
        desc='Data peserta yang sudah dihapus tidak dapat dipulihkan.'
        cancelBtnText='Batal'
        confirmText='Hapus peserta'
        destructive
        handleConfirm={() => void handleDelete()}
      />
    </div>
  )
}
