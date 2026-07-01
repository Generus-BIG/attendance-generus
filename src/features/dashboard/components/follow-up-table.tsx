import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Updater,
} from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTablePagination,
  DataTableFacetedFilter,
} from '@/components/data-table'
import type { MonthlyFormRecap, ParticipantMonthlyRecap } from '../types'
import { RateBarCell } from './rate-bar-cell'

type Props = {
  recap: MonthlyFormRecap | undefined
  isLoading: boolean
  month: Date
  q: string | undefined
  fGroup: string[] | undefined
  fCategory: string[] | undefined
  onQChange: (value: string | undefined) => void
  onFGroupChange: (value: string[] | undefined) => void
  onFCategoryChange: (value: string[] | undefined) => void
}

export function FollowUpTable({
  recap,
  isLoading,
  month,
  q,
  fGroup,
  fCategory,
  onQChange,
  onFGroupChange,
  onFCategoryChange,
}: Props) {
  const totalMeetings = recap?.totals.totalMeetings ?? 0

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
      groupOptions: Array.from(groups)
        .sort()
        .map((g) => ({ label: g, value: g })),
      categoryOptions: Array.from(categories)
        .sort()
        .map((c) => ({ label: c, value: c })),
    }
  }, [recap?.participants])

  const columns = useMemo<ColumnDef<ParticipantMonthlyRecap>[]>(
    () => [
      {
        accessorKey: 'participantName',
        header: 'Peserta',
        cell: ({ row }) => (
          <div className='max-w-[200px] truncate font-medium'>
            {row.original.participantName}
          </div>
        ),
        filterFn: 'includesString',
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
          return (value as string[]).includes(row.getValue(id))
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
          return (value as string[]).includes(row.getValue(id))
        },
      },
      {
        accessorKey: 'hadirCount',
        header: () => <div className='text-center'>Kehadiran</div>,
        cell: ({ row }) => (
          <div className='text-center text-sm tabular-nums'>
            {row.original.hadirCount}/{totalMeetings}
          </div>
        ),
      },
      {
        accessorKey: 'attendanceRate',
        header: () => <div className='text-right'>Tingkat</div>,
        cell: ({ row }) => (
          <RateBarCell
            ratePct={row.original.attendanceRate * 100}
            month={month}
          />
        ),
      },
    ],
    [totalMeetings, month]
  )

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = []
    if (q) filters.push({ id: 'participantName', value: q })
    if (fGroup && fGroup.length > 0)
      filters.push({ id: 'participantGroup', value: fGroup })
    if (fCategory && fCategory.length > 0)
      filters.push({ id: 'participantCategory', value: fCategory })
    return filters
  }, [q, fGroup, fCategory])

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    const next =
      typeof updater === 'function' ? updater(columnFilters) : updater
    const nameFilter = next.find((f) => f.id === 'participantName')?.value as
      | string
      | undefined
    const groupFilter = next.find((f) => f.id === 'participantGroup')?.value as
      | string[]
      | undefined
    const categoryFilter = next.find((f) => f.id === 'participantCategory')
      ?.value as string[] | undefined
    onQChange(nameFilter && nameFilter.length > 0 ? nameFilter : undefined)
    onFGroupChange(
      groupFilter && groupFilter.length > 0 ? groupFilter : undefined
    )
    onFCategoryChange(
      categoryFilter && categoryFilter.length > 0 ? categoryFilter : undefined
    )
  }

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
    onColumnFiltersChange: handleColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) {
    return (
      <Card data-print-card>
        <CardHeader>
          <CardTitle>Tindak Lanjut Peserta</CardTitle>
          <CardDescription className='text-pretty'>
            Daftar peserta dengan rincian kehadiran bulan ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    )
  }

  if (!recap?.participants.length) {
    return (
      <Card data-print-card>
        <CardHeader>
          <CardTitle>Tindak Lanjut Peserta</CardTitle>
          <CardDescription className='text-pretty'>
            Daftar peserta dengan rincian kehadiran bulan ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-32 items-center justify-center text-sm text-muted-foreground'>
            Belum ada data peserta bulan ini.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-print-card>
      <CardHeader>
        <CardTitle>Tindak Lanjut Peserta</CardTitle>
        <CardDescription className='text-pretty'>
          Daftar peserta dengan rincian kehadiran bulan ini. Filter dan cari
          untuk fokus pada peserta yang perlu ditindaklanjuti.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Filters */}
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            placeholder='Cari peserta...'
            value={
              (table.getColumn('participantName')?.getFilterValue() as
                | string
                | undefined) ?? ''
            }
            onChange={(e) =>
              table
                .getColumn('participantName')
                ?.setFilterValue(e.target.value || undefined)
            }
            className='h-9 w-full sm:max-w-xs'
            aria-label='Cari nama peserta'
          />
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
                    Tidak ada data yang sesuai filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <DataTablePagination table={table} />
      </CardContent>
    </Card>
  )
}
