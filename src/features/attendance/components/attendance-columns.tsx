import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Attendance, type Participant } from '@/lib/schema'
import { attendanceStatusTypes } from '../data/data'
import { DataTableRowActions } from './data-table-row-actions'

// Extended type with participant info for display
export type AttendanceWithParticipant = Attendance & {
  participant?: Participant
}

export const attendanceColumns: ColumnDef<AttendanceWithParticipant>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    meta: {
      className: cn('max-md:sticky start-0 z-10 rounded-tl-[inherit]'),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Tanggal' />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('date'))
      return (
        <span className='whitespace-nowrap'>
          {format(date, 'dd MMM yyyy', { locale: idLocale })}
        </span>
      )
    },
  },
  {
    id: 'timestamp',
    accessorFn: (row) => row.timestamp || row.date,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Waktu' />
    ),
    cell: ({ row }) => {
      const timestamp = row.original.timestamp || row.original.date
      if (!timestamp) return <span>-</span>
      const date = new Date(timestamp)
      return (
        <span className='whitespace-nowrap text-muted-foreground'>
          {format(date, 'HH:mm', { locale: idLocale })}
        </span>
      )
    },
  },
  {
    id: 'participantName',
    accessorFn: (row) => row.participant?.name || row.tempName || '-',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Nama Peserta' />
    ),
    cell: ({ row }) => {
      const participant = row.original.participant
      const tempName = row.original.tempName
      return (
        <div className='flex flex-col'>
          <span className='font-medium'>
            {participant?.name || tempName || '-'}
          </span>
          {!participant && tempName && (
            <span className='text-xs text-amber-600'>(Belum terhubung)</span>
          )}
        </div>
      )
    },
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
        'ps-0.5 max-md:sticky start-6 @4xl/content:table-cell @4xl/content:drop-shadow-none'
      ),
    },
    enableHiding: false,
  },
  {
    id: 'kelompok',
    accessorFn: (row) => row.participant?.kelompok || row.tempKelompok || '-',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Kelompok' />
    ),
    cell: ({ row }) => {
      const kelompok = row.original.participant?.kelompok || row.original.tempKelompok
      return <span>{kelompok || '-'}</span>
    },
    filterFn: (row, id, value) => {
      const kelompok = row.original.participant?.kelompok || row.original.tempKelompok
      return Array.isArray(value) && value.includes(kelompok)
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as Attendance['status']
      return (
        <Badge
          variant='outline'
          className={cn('capitalize', attendanceStatusTypes.get(status))}
        >
          {status === 'hadir' ? 'Hadir' : 'Izin'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return Array.isArray(value) && value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'permissionReason',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Alasan Izin' />
    ),
    cell: ({ row }) => {
      const reason = row.getValue('permissionReason') as string | null
      const notes = row.original.notes
      return (
        <div className='flex flex-col'>
          <span>{reason || '-'}</span>
          {notes && (
            <span className='text-muted-foreground text-xs truncate max-w-32'>
              {notes}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: DataTableRowActions,
  },
]
