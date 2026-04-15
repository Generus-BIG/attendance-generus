import { useState } from 'react'
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table'
import { id as idLocale } from 'date-fns/locale'
import { CalendarDays, ExternalLink, Plus } from 'lucide-react'
import { type AttendanceFormConfig } from '@/lib/schema'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PermissionGate } from '@/components/permission-gate'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { FormActions } from './components/form-actions'
import { FormsProvider, useFormsContext } from './context/forms-context'

export function Forms() {
  return (
    <FormsProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <FormsList />
      </Main>
    </FormsProvider>
  )
}

function FormsList() {
  const { forms, isLoading } = useFormsContext()
  const { can } = usePermissions()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')

  const columns: ColumnDef<AttendanceFormConfig>[] = [
    {
      accessorKey: 'title',
      header: 'Judul',
      cell: ({ row }) => {
        const title = row.getValue('title') as string
        const slug = row.original.slug
        return (
          <div className='flex flex-col gap-0.5'>
            <span className='font-medium'>{title}</span>
            <span className='flex items-center gap-1 text-xs text-muted-foreground'>
              <ExternalLink className='h-3 w-3' />
              /absensi/{slug}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'date',
      header: 'Tanggal',
      cell: ({ row }) => {
        const date = new Date(row.getValue('date'))
        return (
          <div className='flex items-center gap-2 text-sm'>
            <CalendarDays className='h-3.5 w-3.5 text-muted-foreground' />
            {format(date, 'dd MMM yyyy, HH:mm', { locale: idLocale })}
          </div>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.getValue('isActive') as boolean
        return (
          <Badge
            variant='outline'
            className={cn(
              active
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
            )}
          >
            {active ? 'Aktif' : 'Nonaktif'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <FormActions form={row.original} />,
    },
  ]

  const table = useReactTable({
    data: forms,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnVisibility,
      globalFilter,
    },
  })

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Page header */}
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Formulir Absensi
          </h2>
          <p className='text-muted-foreground'>
            Buat dan kelola sesi absensi.
          </p>
        </div>
        <PermissionGate allowed={can.createForm}>
          <Button asChild>
            <Link to='/admin/forms/create'>
              <Plus className='mr-2 h-4 w-4' />
              Buat Form
            </Link>
          </Button>
        </PermissionGate>
      </div>

      {/* Search */}
      <div className='flex items-center'>
        <Input
          placeholder='Cari formulir...'
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className='max-w-sm'
        />
      </div>

      {/* Table */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className='flex flex-col gap-1'>
                      <Skeleton className='h-4 w-32' />
                      <Skeleton className='h-3 w-24' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-28' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-5 w-14 rounded-full' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-8 w-8 rounded-md' />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-32 text-center'
                >
                  <div className='flex flex-col items-center gap-1.5 text-muted-foreground'>
                    <CalendarDays className='h-8 w-8 opacity-40' />
                    <p className='text-sm'>Belum ada formulir.</p>
                    <PermissionGate allowed={can.createForm}>
                      <Button variant='link' size='sm' asChild>
                        <Link to='/admin/forms/create'>
                          Buat formulir pertama
                        </Link>
                      </Button>
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          {table.getFilteredRowModel().rows.length} formulir
        </p>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    </div>
  )
}
