import { UserMinus, UserCheck, Trash2 } from 'lucide-react'
import { type Table } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { type Participant } from '@/lib/schema'
import { useParticipantsCRUD } from '../context/participants-context'

type DataTableBulkActionsProps = {
  table: Table<Participant>
}

export function DataTableBulkActions({ table }: DataTableBulkActionsProps) {
  const { updateParticipant, deleteParticipants } = useParticipantsCRUD()
  const selectedRows = table.getSelectedRowModel().rows

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
    } catch {
      // Error handled by mutation onError
    }
  }

  return (
    <div className='flex items-center gap-2'>
      <span className='text-muted-foreground text-sm'>
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
      <Button variant='destructive' size='sm' onClick={handleDelete}>
        <Trash2 className='mr-2 h-4 w-4' />
        Hapus
      </Button>
    </div>
  )
}
