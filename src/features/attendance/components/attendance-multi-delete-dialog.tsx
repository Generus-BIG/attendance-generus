'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { supabase } from '@/lib/supabase'
import { useAttendance } from './attendance-provider'

type AttendanceMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function AttendanceMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: AttendanceMultiDeleteDialogProps<TData>) {
  const { refreshData } = useAttendance()
  const [isDeleting, setIsDeleting] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = async () => {
    const ids = selectedRows.map((row) => (row.original as { id: string }).id)
    if (ids.length === 0) {
      onOpenChange(false)
      return
    }

    setIsDeleting(true)
    const { error } = await supabase.from('attendance').delete().in('id', ids)
    setIsDeleting(false)

    if (error) {
      toast.error('Gagal menghapus data: ' + error.message)
      return
    }

    toast.success(`${ids.length} data absensi berhasil dihapus`)
    table.resetRowSelection()
    refreshData()
    onOpenChange(false)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) {
          onOpenChange(nextOpen)
        }
      }}
      handleConfirm={handleDelete}
      title={
        <span className='text-destructive'>
          Hapus {selectedRows.length} data absensi?
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Anda yakin ingin menghapus data absensi yang dipilih? Data yang sudah dihapus tidak dapat
            dikembalikan.
          </p>
        </div>
      }
      confirmText='Hapus'
      destructive
      disabled={isDeleting}
    />
  )
}
