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
import { format, parseISO } from 'date-fns'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { TableSkeleton } from '@/components/data-table/table-skeleton'
import { DatePicker } from '@/components/date-picker'
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

  // Date-range filters from URL search state
  const fromDate =
    typeof search.from === 'string' && search.from ? search.from : undefined
  const toDate =
    typeof search.to === 'string' && search.to ? search.to : undefined

  const {
    data: rawData = [],
    refetch,
    isLoading,
  } = useQuery<AttendanceWithParticipant[]>({
    queryKey: ['attendance_list', tmGroupId, fromDate, toDate],
    queryFn: () =>
      getAttendanceList(tmGroupId, { from: fromDate, to: toDate }),
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
      <div className='flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2'>
        <span className='text-muted-foreground text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
          Periode
        </span>
        <div className='flex w-full items-center gap-1.5 sm:w-auto'>
          <DatePicker
            selected={fromDate ? parseISO(fromDate) : undefined}
            onSelect={(d) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  from: d ? format(d, 'yyyy-MM-dd') : undefined,
                }),
              })
            }
            placeholder='Dari'
            className='flex-1 sm:w-44 sm:flex-none'
          />
          <span className='text-muted-foreground text-xs'>—</span>
          <DatePicker
            selected={toDate ? parseISO(toDate) : undefined}
            onSelect={(d) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  to: d ? format(d, 'yyyy-MM-dd') : undefined,
                }),
              })
            }
            placeholder='Sampai'
            className='flex-1 sm:w-44 sm:flex-none'
          />
          {(fromDate || toDate) && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='max-sm:px-2'
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    from: undefined,
                    to: undefined,
                  }),
                })
              }
            >
              Reset
            </Button>
          )}
        </div>
      </div>
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
          {isLoading ? (
            <TableSkeleton columns={table.getAllColumns().length} />
          ) : (
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
                    className='h-24 text-center text-muted-foreground'
                  >
                    {fromDate || toDate ? (
                      <>
                        Tidak ada absensi pada periode yang dipilih. Coba reset
                        filter periode.
                      </>
                    ) : (
                      <>
                        Belum ada data absensi. Catat kehadiran baru lewat{' '}
                        <strong>Input Absensi</strong>.
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
      <DataTableBulkActions table={table} />
    </div>
  )
}
