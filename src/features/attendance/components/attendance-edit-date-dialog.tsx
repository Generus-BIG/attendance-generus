'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/date-picker'
import { type Attendance } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import { useAttendance } from './attendance-provider'

type AttendanceEditDateDialogProps = {
  currentRow?: Attendance
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttendanceEditDateDialog({
  currentRow,
  open,
  onOpenChange,
}: AttendanceEditDateDialogProps) {
  const { refreshData } = useAttendance()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentRow?.date instanceof Date ? currentRow.date : currentRow?.date ? new Date(currentRow.date) : undefined
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedDate || !currentRow) {
      toast.error('Tanggal harus dipilih')
      return
    }

    setIsSubmitting(true)
    try {
      // Construct timestamp: selected date at 00:00 UTC (same format as main dialog)
      const timestamp = new Date(Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0, 0, 0, 0
      )).toISOString()

      const { error } = await supabase
        .from('attendance')
        .update({ timestamp })
        .eq('id', currentRow.id)

      if (error) throw error

      toast.success('Tanggal absensi berhasil diperbarui')
      refreshData()
      onOpenChange(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating attendance date:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Gagal memperbarui tanggal: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-106.25'>
        <DialogHeader>
          <DialogTitle>Edit Tanggal Absensi</DialogTitle>
          <DialogDescription>
            Ubah tanggal absensi. Kolom lainnya tidak akan berubah.
          </DialogDescription>
        </DialogHeader>

        {currentRow && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-sm font-medium'>Peserta</p>
              <p className='text-sm text-muted-foreground'>
                {currentRow.tempName || 'Peserta'}
              </p>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Tanggal Baru</p>
              <DatePicker
                selected={selectedDate}
                onSelect={setSelectedDate}
                placeholder='Pilih tanggal...'
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedDate}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
