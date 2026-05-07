import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type ManagedUser } from '../types'
import { DataTableRowActions } from './data-table-row-actions'
import { RoleBadge } from './role-badge'
import { TempPasswordReveal } from './temp-password-reveal'

export function useManageRoleColumns(): ColumnDef<ManagedUser>[] {
  const { can } = usePermissions()

  const columns: ColumnDef<ManagedUser>[] = [
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
      accessorKey: 'full_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama' />
      ),
      cell: ({ row }) => {
        const fullName = row.getValue('full_name') as string | null
        const email = row.original.email
        return (
          <div className='flex flex-col'>
            <span className='font-medium'>{fullName ?? '-'}</span>
            <span className='text-xs text-muted-foreground'>{email}</span>
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
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Role' />
      ),
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
      filterFn: (row, id, value) => {
        return Array.isArray(value) && value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'kelompok',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kelompok' />
      ),
      cell: ({ row }) => {
        const kelompok = row.getValue('kelompok') as string | null
        return <span>{kelompok ?? '-'}</span>
      },
    },
  ]

  // Password and actions columns only for super_admin
  if (can.manageUsers) {
    columns.push(
      {
        id: 'password',
        accessorKey: 'temp_password',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Password Sementara'
          />
        ),
        cell: ({ row }) => (
          <TempPasswordReveal password={row.original.temp_password ?? null} />
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        cell: ({ row }) => <DataTableRowActions row={row} />,
      }
    )
  }

  return columns
}
