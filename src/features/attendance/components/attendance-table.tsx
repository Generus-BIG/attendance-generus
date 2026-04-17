import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { kelompokOptions } from '@/features/participants/data/data'
import { attendanceStatusOptions } from '../data/data'
import { getAttendanceList } from '../services'
import {
  attendanceColumns as columns,
  type AttendanceWithParticipant,
} from './attendance-columns'
import { useAttendance } from './attendance-provider'
import { DataTableBulkActions } from './data-table-bulk-actions'

type DataTableProps = {
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function AttendanceTable({ search, navigate }: DataTableProps) {
  const { setRefreshData } = useAttendance()
  const role = useAuthStore((s) => s.auth.role)
  const userKelompok = useAuthStore((s) => s.auth.kelompok)

  // Fetch kelompok UUID for TM filtering
  const { data: kelompokGroupId } = useQuery({
    queryKey: ['lookup_kelompok_id', userKelompok],
    queryFn: async () => {
      if (!userKelompok) return undefined
      const { data } = await (await import('@/lib/supabase')).supabase
        .from('lookup_values')
        .select('id')
        .eq('type', 'GROUP')
        .eq('value', userKelompok)
        .maybeSingle()
      return data?.id as string | undefined
    },
    enabled: role === 'team_manager' && !!userKelompok,
    staleTime: 1000 * 60 * 10,
  })

  const tmGroupId = role === 'team_manager' ? kelompokGroupId : undefined
  // For TM: wait until kelompok UUID is resolved before fetching attendance
  const isTmReady = role !== 'team_manager' || !!tmGroupId

  const {
    data: rawData = [],
    refetch,
    isLoading: _isLoading,
  } = useQuery<AttendanceWithParticipant[]>({
    queryKey: ['attendance_list', tmGroupId],
    queryFn: () => getAttendanceList(tmGroupId),
    enabled: isTmReady,
  })

  // TM: filter out rows where participant is from another kelompok (handles null participant edge cases)
  const data = useMemo(() => {
    if (role !== 'team_manager' || !userKelompok) return rawData
    return rawData.filter(
      (row) =>
        row.participant?.kelompok === userKelompok ||
        row.tempKelompok === userKelompok
    )
  }, [rawData, role, userKelompok])

  // Extract unique form titles for the form filter
  const formFilterOptions = useMemo(() => {
    const titles = new Set<string>()
    data.forEach((row) => {
      if (row.formTitle) titles.add(row.formTitle)
    })
    return Array.from(titles)
      .sort()
      .map((title) => ({ label: title, value: title }))
  }, [data])

  // Local UI-only states
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    formTitle: false,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ])

  useEffect(() => {
    setRefreshData(() => refetch)
  }, [refetch, setRefreshData])

  // Synced with URL states
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: 'participantName', searchKey: 'name', type: 'string' },
      { columnId: 'kelompok', searchKey: 'kelompok', type: 'array' },
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: 'formTitle', searchKey: 'form', type: 'array' },
    ],
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  useEffect(() => {
    ensurePageInRange(table.getPageCount())
  }, [table, ensurePageInRange])

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari nama peserta...'
        searchKey='participantName'
        filters={[
          ...(formFilterOptions.length > 0
            ? [
                {
                  columnId: 'formTitle',
                  title: 'Forms',
                  options: formFilterOptions,
                },
              ]
            : []),
          ...(role !== 'team_manager'
            ? [
                {
                  columnId: 'kelompok',
                  title: 'Kelompok',
                  options: kelompokOptions.map((k) => ({
                    label: k.label,
                    value: k.value,
                  })),
                },
              ]
            : []),
          {
            columnId: 'status',
            title: 'Status',
            options: attendanceStatusOptions.map((s) => ({
              label: s.label,
              value: s.value,
            })),
          },
        ]}
      />
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        header.column.columnDef.meta?.className,
                        header.column.columnDef.meta?.thClassName
                      )}
                    >
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
                  className='group/row'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
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
                  Belum ada data absensi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
      <DataTableBulkActions table={table} />
    </div>
  )
}
