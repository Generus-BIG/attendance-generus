import { type ColumnDef } from '@tanstack/react-table'
import { format, differenceInYears } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Participant } from '@/lib/schema'
import { statusTypes } from '../data/data'
import { DataTableRowActions } from './data-table-row-actions'

export const participantsColumns: ColumnDef<Participant>[] = [
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
        className='translate-y-0.5'
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
        className='translate-y-0.5'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Nama' />
    ),
    cell: ({ row }) => (
      <span className='block max-w-[22ch] font-medium whitespace-normal break-words @4xl/content:max-w-none'>
        {row.getValue('name')}
      </span>
    ),
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
        'ps-0.5 max-md:sticky start-6 @4xl/content:table-cell @4xl/content:drop-shadow-none'
      ),
    },
    enableHiding: false,
  },
  {
    accessorKey: 'kelompok',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Kelompok' />
    ),
    cell: ({ row }) => <span>{row.getValue('kelompok')}</span>,
    filterFn: (row, id, value) => {
      return Array.isArray(value) && value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'kategori',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Kategori' />
    ),
    cell: ({ row }) => {
      const kategori = row.getValue('kategori') as string
      const label =
        kategori === 'AR' || kategori === 'APR' ? kategori : `GPN ${kategori}`
      return <Badge variant='outline'>{label}</Badge>
    },
    filterFn: (row, id, value) => {
      return Array.isArray(value) && value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'gender',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Jenis Kelamin' />
    ),
    cell: ({ row }) => {
      const gender = row.getValue('gender') as string
      return <span>{gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
    },
    filterFn: (row, id, value) => {
      return Array.isArray(value) && value.includes(row.getValue(id))
    },
    meta: {
      className: cn('hidden @xl/content:table-cell'),
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as Participant['status']
      return (
        <Badge
          variant='outline'
          className={cn('capitalize', statusTypes.get(status))}
        >
          {status === 'active' ? 'Aktif' : 'Nonaktif'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return Array.isArray(value) && value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'birthDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Tgl Lahir' />
    ),
    cell: ({ row }) => {
      const birthDate = row.original.birthDate
      return (
        <span className='block max-w-[14ch] whitespace-normal break-words text-muted-foreground'>
          {birthDate
            ? format(birthDate, 'dd MMM yyyy', { locale: idLocale })
            : '—'}
        </span>
      )
    },
    meta: {
      className: cn('hidden @3xl/content:table-cell'),
    },
    enableSorting: true,
  },
  {
    id: 'age',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Usia' />
    ),
    cell: ({ row }) => {
      const birthDate = row.original.birthDate
      if (!birthDate) return <span className='text-muted-foreground'>—</span>
      const age = differenceInYears(new Date(), birthDate)
      return (
        <span className='block max-w-[8ch] whitespace-normal break-words tabular-nums'>
          {age} th
        </span>
      )
    },
    meta: {
      className: cn('hidden @2xl/content:table-cell'),
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    cell: DataTableRowActions,
  },
]
