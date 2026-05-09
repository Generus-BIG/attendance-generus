'use client'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { type Attendance } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAttendance } from './attendance-provider'

type AttendanceDeleteDialogProps = {
  currentRow: Attendance
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttendanceDeleteDialog({
  currentRow,
  open,
  onOpenChange,
}: AttendanceDeleteDialogProps) {
  const { refreshData } = useAttendance()

  const handleDelete = async () => {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', currentRow.id)

    if (error) {
      toast.error('Gagal menghapus data: ' + error.message)
      return
    }

    toast.success('Data absensi berhasil dihapus')
    refreshData()
    onOpenChange(false)
  }

  const rowWithParticipant = currentRow as Attendance & {
    participant?: { name?: string | null }
  }
  const participantName =
    rowWithParticipant.participant?.name || currentRow.tempName || '-'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      title={<span className='text-destructive'>Hapus Data Absensi?</span>}
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Anda yakin ingin menghapus data absensi ini? Data yang sudah dihapus
            tidak dapat dikembalikan.
          </p>
          <ul className='list-disc ps-4 text-sm text-muted-foreground'>
            <li>
              Nama: <span className='font-semibold'>{participantName}</span>
            </li>
            <li>
              Tanggal:{' '}
              <span className='font-semibold'>
                {format(new Date(currentRow.date), 'dd MMM yyyy', {
                  locale: idLocale,
                })}
              </span>
            </li>
            <li>
              Status:{' '}
              <span className='font-semibold capitalize'>
                {currentRow.status}
              </span>
            </li>
          </ul>
        </div>
      }
      confirmText='Hapus'
      destructive
    />
  )
}
