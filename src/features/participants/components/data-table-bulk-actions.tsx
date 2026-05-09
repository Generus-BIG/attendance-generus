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
    <div className='flex items-center gap-2'>
      <span className='text-sm text-muted-foreground'>
        {selectedRows.length} peserta dipilih
      </span>
      <Button variant='outline' size='sm' onClick={handleActivate}>
        <UserCheck className='mr-2 h-4 w-4' />
        Aktifkan
      </Button>
      <Button variant='outline' size='sm' onClick={handleDeactivate}>
        <UserMinus className='mr-2 h-4 w-4' />
        Nonaktifkan
      </Button>
      <Button
        variant='destructive'
        size='sm'
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className='mr-2 h-4 w-4' />
        Hapus
      </Button>
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
