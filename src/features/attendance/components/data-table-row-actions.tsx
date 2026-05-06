import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Calendar, Trash2 } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type AttendanceWithParticipant } from './attendance-columns'
import { useAttendance } from './attendance-provider'

type DataTableRowActionsProps = {
  row: Row<AttendanceWithParticipant>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useAttendance()
  const { can } = usePermissions()

  if (!can.editAttendance && !can.deleteAttendance) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-11 w-11 p-0 data-[state=open]:bg-muted'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        {can.editAttendance && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('edit-date')
            }}
          >
            Edit Tanggal
            <DropdownMenuShortcut>
              <Calendar size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        {can.editAttendance && can.deleteAttendance && (
          <DropdownMenuSeparator />
        )}
        {can.deleteAttendance && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('delete')
            }}
            className='text-red-500!'
          >
            Hapus
            <DropdownMenuShortcut>
              <Trash2 size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
