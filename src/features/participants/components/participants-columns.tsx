import { differenceInYears, format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { id as idLocale } from 'date-fns/locale'
import { type Participant } from '@/lib/schema'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
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
      className: cn('w-8 max-md:sticky start-0 z-20 rounded-tl-[inherit]'),
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
      <span className='block max-w-[22ch] font-medium wrap-break-word whitespace-normal @4xl/content:max-w-none'>
        {row.getValue('name')}
      </span>
    ),
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
        'ps-0.5 max-md:sticky start-8 z-10 @4xl/content:table-cell @4xl/content:drop-shadow-none'
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
      const birthPlace = row.original.birthPlace?.trim()

      if (!birthDate && !birthPlace) {
        return <span className='text-muted-foreground'>-</span>
      }

      const formattedDate = birthDate
        ? format(birthDate, 'dd MMM yyyy', { locale: idLocale })
        : null

      return (
        <span className='block max-w-[20ch] wrap-break-word whitespace-normal tabular-nums'>
          {[birthPlace, formattedDate].filter(Boolean).join(', ')}
        </span>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.birthDate?.getTime() ?? 0
      const b = rowB.original.birthDate?.getTime() ?? 0
      return a - b
    },
    meta: {
      className: cn('hidden @3xl/content:table-cell'),
    },
  },
  {
    id: 'age',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title='Usia'
        className='justify-end text-right'
      />
    ),
    cell: ({ row }) => {
      const birthDate = row.original.birthDate
      if (!birthDate)
        return <span className='block text-right text-muted-foreground'>-</span>

      return (
        <span className='block max-w-[8ch] text-right wrap-break-word whitespace-normal tabular-nums'>
          {differenceInYears(new Date(), birthDate)} tahun
        </span>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.birthDate
        ? differenceInYears(new Date(), rowA.original.birthDate)
        : -1
      const b = rowB.original.birthDate
        ? differenceInYears(new Date(), rowB.original.birthDate)
        : -1
      return a - b
    },
    meta: {
      className: cn('hidden @2xl/content:table-cell text-right'),
    },
  },
  {
    id: 'actions',
    cell: DataTableRowActions,
  },
]
