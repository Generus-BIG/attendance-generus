import { UserMinus } from 'lucide-react'
import { type Table } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { type Participant } from '@/lib/schema'
import { participantService } from '../services'
import { useParticipants } from './participants-provider'

type DataTableBulkActionsProps = {
  table: Table<Participant>
}

export function DataTableBulkActions({ table }: DataTableBulkActionsProps) {
  const { refreshData } = useParticipants()
  const selectedRows = table.getSelectedRowModel().rows

  const handleDeactivate = async () => {
    try {
      const ids = selectedRows.map((row) => row.original.id)
      const count = await participantService.bulkUpdateStatus(ids, 'inactive')
      toast.success(`${count} peserta berhasil dinonaktifkan`)
      table.resetRowSelection()
      refreshData()
    } catch {
      toast.error('Gagal menonaktifkan peserta')
    }
  }

  const handleActivate = async () => {
    try {
      const ids = selectedRows.map((row) => row.original.id)
      const count = await participantService.bulkUpdateStatus(ids, 'active')
      toast.success(`${count} peserta berhasil diaktifkan`)
      table.resetRowSelection()
      refreshData()
    } catch {
      toast.error('Gagal mengaktifkan peserta')
    }
  }

  return (
    <div className='flex items-center gap-2'>
      <span className='text-muted-foreground text-sm'>
        {selectedRows.length} peserta dipilih
      </span>
      <Button variant='outline' size='sm' onClick={handleActivate}>
        Aktifkan
      </Button>
      <Button variant='outline' size='sm' onClick={handleDeactivate}>
        <UserMinus className='mr-2 h-4 w-4' />
        Nonaktifkan
      </Button>
    </div>
  )
}
