import { useState } from 'react'
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
} from '@tanstack/react-table'
import { Plus } from 'lucide-react'
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
import { AttendanceFormConfig } from '@/lib/schema'
import { FormsProvider, useFormsContext } from './context/forms-context'
import { FormActions } from './components/form-actions'
import { FormDialogs } from './components/form-dialogs'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

// Wrapper to provide context
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
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [openCreate, setOpenCreate] = useState(false)
    const [globalFilter, setGlobalFilter] = useState('')

    const columns: ColumnDef<AttendanceFormConfig>[] = [
        {
            accessorKey: 'title',
            header: 'Title',
            cell: ({ row }) => <div className='font-medium'>{row.getValue('title')}</div>,
        },
        {
            accessorKey: 'date',
            header: 'Date',
            cell: ({ row }) => {
                return <div>{format(new Date(row.getValue('date')), 'dd MMMM yyyy HH:mm', { locale: id })}</div>
            },
        },
        {
            accessorKey: 'slug',
            header: 'Slug (URL)',
            cell: ({ row }) => <div className='font-mono text-xs'>{row.getValue('slug')}</div>,
        },
        {
            accessorKey: 'isActive',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={row.getValue('isActive') ? 'default' : 'secondary'}>
                    {row.getValue('isActive') ? 'Active' : 'Inactive'}
                </Badge>
            ),
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
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: 'includesString', // Simple string search
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
    })

    if (isLoading) {
        return <div>Loading forms...</div> // Better loading skeleton can be added
    }

    return (
        <div className='flex flex-1 flex-col gap-4'>
            <div className='flex items-center justify-between'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>Attendance Forms</h2>
                    <p className='text-muted-foreground'>
                        Create and manage attendance sessions.
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <Button onClick={() => setOpenCreate(true)}>
                        <Plus className='mr-2 h-4 w-4' /> Create Form
                    </Button>
                </div>
            </div>

            <div className='flex items-center py-4'>
                <Input
                    placeholder='Search forms...'
                    value={globalFilter ?? ''}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className='max-w-sm'
                />
            </div>
            <div className='rounded-md border'>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
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
                                    className='h-24 text-center'
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className='flex items-center justify-end space-x-2 py-4'>
                <div className='flex-1 text-sm text-muted-foreground'>
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className='space-x-2'>
                    <Button
                        variant='outline'
                        size='sm'
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant='outline'
                        size='sm'
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>

            <FormDialogs open={openCreate} setOpen={setOpenCreate} />
        </div>
    )
}
