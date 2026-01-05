import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableFacetedFilter } from '@/components/data-table'
import { cn } from '@/lib/utils'
import type { MonthlyFormRecap, ParticipantMonthlyRecap } from '../types'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
}

export function FollowUpTable({ recap, isLoading }: Props) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const totalMeetings = recap?.totals.totalMeetings ?? 0

  // Extract unique groups and categories for filter options
  const { groupOptions, categoryOptions } = useMemo(() => {
    if (!recap?.participants.length) {
      return { groupOptions: [], categoryOptions: [] }
    }
    
    const groups = new Set<string>()
    const categories = new Set<string>()
    
    for (const p of recap.participants) {
      if (p.participantGroup) groups.add(p.participantGroup)
      if (p.participantCategory) categories.add(p.participantCategory)
    }
    
    return {
      groupOptions: Array.from(groups).sort().map((g) => ({ label: g, value: g })),
      categoryOptions: Array.from(categories).sort().map((c) => ({ label: c, value: c })),
    }
  }, [recap?.participants])

  const columns = useMemo<ColumnDef<ParticipantMonthlyRecap>[]>(() => [
    {
      accessorKey: 'participantName',
      header: 'Peserta',
      cell: ({ row }) => (
        <div className='font-medium truncate max-w-[200px]'>
          {row.original.participantName}
        </div>
      ),
    },
    {
      accessorKey: 'participantGroup',
      header: 'Kelompok',
      cell: ({ row }) => (
        <div className='text-sm text-muted-foreground'>
          {row.original.participantGroup ?? '-'}
        </div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'participantCategory',
      header: 'Kategori',
      cell: ({ row }) => (
        <div className='text-sm text-muted-foreground'>
          {row.original.participantCategory ?? '-'}
        </div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'hadirCount',
      header: () => <div className='text-center'>Kehadiran</div>,
      cell: ({ row }) => (
        <div className='text-center font-mono text-sm'>
          {row.original.hadirCount}/{totalMeetings}
        </div>
      ),
    },
    {
      accessorKey: 'attendanceRate',
      header: () => <div className='text-right'>Rate</div>,
      cell: ({ row }) => {
        const rate = Math.round(row.original.attendanceRate * 100)
        const isLow = rate < 50
        const isCritical = rate < 25

        return (
          <div className='text-right'>
            <Badge
              variant={isCritical ? 'destructive' : isLow ? 'secondary' : 'outline'}
              className={cn(
                'font-mono',
                !isCritical && !isLow && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              )}
            >
              {rate}%
            </Badge>
          </div>
        )
      },
    },
  ], [totalMeetings])

  const table = useReactTable({
    data: recap?.participants ?? [],
    columns,
    state: {
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='flex items-center gap-4'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <div className='flex-1 space-y-1'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-3 w-20' />
            </div>
            <Skeleton className='h-6 w-12' />
          </div>
        ))}
      </div>
    )
  }

  if (!recap?.participants.length) {
    return (
      <div className='flex h-32 items-center justify-center text-muted-foreground'>
        Belum ada data peserta bulan ini
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex flex-wrap gap-2'>
        {groupOptions.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn('participantGroup')}
            title='Kelompok'
            options={groupOptions}
          />
        )}
        {categoryOptions.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn('participantCategory')}
            title='Kategori'
            options={categoryOptions}
          />
        )}
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  Tidak ada data yang sesuai filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  )
}
