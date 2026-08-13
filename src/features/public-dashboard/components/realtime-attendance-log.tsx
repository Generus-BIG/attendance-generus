import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  PlusCircledIcon,
} from '@radix-ui/react-icons'
import { id as idLocale } from 'date-fns/locale'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Clock,
  Search,
  X,
} from 'lucide-react'
import { cn, getPageNumbers } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type PublicDashboardRecord } from '../types'

// ── Types ──────────────────────────────────────────────────────────────

interface RealtimeAttendanceLogProps {
  records: PublicDashboardRecord[]
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Derive the display group/category/name for a record */
function displayOf(r: PublicDashboardRecord) {
  return {
    name: r.participant_name || r.temp_name || '-',
    group: r.group_value || '-',
    category: r.category_value || r.temp_category || '-',
  }
}

function AttendanceActivityItem({ record }: { record: PublicDashboardRecord }) {
  const dateObj = record.timestamp ? new Date(record.timestamp) : new Date()
  const dateStr = format(dateObj, 'd MMM yyyy', { locale: idLocale })
  const timeStr = format(dateObj, 'HH:mm')
  const isHadir = record.status === 'HADIR'
  const statusLabel = isHadir ? 'Hadir' : 'Izin'
  const d = displayOf(record)

  return (
    <article className='px-4 py-3.5'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='truncate text-sm font-semibold text-foreground'>
            {d.name}
          </h3>
          <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
            <span>{d.group}</span>
            {d.category && d.category !== '-' && (
              <>
                <span aria-hidden='true'>·</span>
                <span>{d.category}</span>
              </>
            )}
          </div>
        </div>
        <Badge
          variant='outline'
          className={cn(
            'shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
            isHadir
              ? 'border-teal-200/50 bg-teal-100/30 text-teal-900 dark:border-teal-800/30 dark:text-teal-200'
              : 'border-amber-200/50 bg-amber-100/30 text-amber-900 dark:border-amber-800/30 dark:text-amber-200'
          )}
        >
          {statusLabel}
        </Badge>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
        <span className='inline-flex items-center gap-1 tabular-nums'>
          <CalendarDays className='h-3.5 w-3.5' />
          {dateStr}
        </span>
        <span className='inline-flex items-center gap-1 tabular-nums'>
          <Clock className='h-3.5 w-3.5' />
          {timeStr}
        </span>
        {!record.participant_id && record.temp_name && (
          <span className='font-medium text-amber-700 dark:text-amber-300'>
            Belum terhubung
          </span>
        )}
      </div>

      {!isHadir && (
        <div className='mt-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2'>
          <p className='text-xs font-medium text-foreground/90'>
            {record.permission_reason || 'Izin'}
          </p>
          {record.permission_description && (
            <p className='mt-1 text-xs leading-relaxed wrap-break-word text-muted-foreground'>
              {record.permission_description}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

// ── Filter option constants ────────────────────────────────────────────

const KELOMPOK_OPTIONS = [
  { label: 'BIG 1', value: 'BIG 1' },
  { label: 'BIG 2', value: 'BIG 2' },
  { label: 'Cakra', value: 'Cakra' },
  { label: 'Limo', value: 'Limo' },
  { label: 'Meruyung', value: 'Meruyung' },
]

const KATEGORI_OPTIONS = [
  { label: 'GPN A', value: 'GPN A' },
  { label: 'GPN B', value: 'GPN B' },
  { label: 'AR', value: 'AR' },
  { label: 'APR', value: 'APR' },
]

const STATUS_OPTIONS = [
  { label: 'Hadir', value: 'HADIR' },
  { label: 'Izin', value: 'IZIN' },
]

// ── Standalone faceted filter (no TanStack dependency) ─────────────────

function FacetedFilter({
  title,
  options,
  selected,
  onChange,
  counts,
}: {
  title: string
  options: { label: string; value: string }[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  counts?: Map<string, number>
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-10 border-dashed text-xs sm:h-8'
        >
          <PlusCircledIcon className='size-4' />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <Badge
                variant='secondary'
                className='rounded-sm px-1 text-[10px] font-normal lg:hidden'
              >
                {selected.size}
              </Badge>
              <div className='hidden space-x-1 lg:flex'>
                {selected.size > 2 ? (
                  <Badge
                    variant='secondary'
                    className='rounded-sm px-1 text-[10px] font-normal'
                  >
                    {selected.size} dipilih
                  </Badge>
                ) : (
                  options.flatMap((o) =>
                    selected.has(o.value)
                      ? [
                          <Badge
                            variant='secondary'
                            key={o.value}
                            className='rounded-sm px-1 text-[10px] font-normal'
                          >
                            {o.label}
                          </Badge>,
                        ]
                      : []
                  )
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-50 p-0' align='start'>
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const next = new Set(selected)
                      if (isSelected) next.delete(option.value)
                      else next.add(option.value)
                      onChange(next)
                    }}
                    className='text-xs'
                  >
                    <div
                      className={cn(
                        'mr-2 flex size-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className='h-4 w-4 text-background' />
                    </div>
                    <span>{option.label}</span>
                    {counts?.get(option.value) != null && (
                      <span className='ms-auto flex h-4 w-4 items-center justify-center font-mono text-[10px] text-muted-foreground'>
                        {counts.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange(new Set())}
                    className='justify-center text-center text-xs text-destructive hover:text-destructive'
                  >
                    Hapus filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Pagination subcomponent ───────────────────────────────────────────

interface LogPaginationProps {
  currentPage: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function LogPagination({
  currentPage,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: LogPaginationProps) {
  const totalPages = Math.ceil(totalRecords / pageSize) || 1
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const firstRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastRecord = Math.min(currentPage * pageSize, totalRecords)
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const handlePageSizeChange = (size: number) => {
    onPageSizeChange(size)
    onPageChange(1)
  }

  return (
    <div className='border-t border-border/40 px-3 py-3 sm:px-4'>
      <div className='flex items-center justify-between gap-3 sm:hidden'>
        <div className='min-w-0'>
          <p className='flex items-center gap-1 text-xs font-medium text-foreground tabular-nums'>
            <span>
              {firstRecord}-{lastRecord}
            </span>
            <span>dari</span>
            <span>{totalRecords}</span>
          </p>
          <p className='flex items-center gap-1 text-[11px] text-muted-foreground'>
            <span>Halaman</span>
            <span className='tabular-nums'>{currentPage}</span>
            <span>dari</span>
            <span className='tabular-nums'>{totalPages}</span>
          </p>
        </div>
        <div className='flex items-center gap-1.5'>
          <Button
            variant='outline'
            className='size-11 p-0'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            aria-label='Halaman sebelumnya'
          >
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-11 p-0'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            aria-label='Halaman berikutnya'
          >
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <div className='mt-3 flex items-center justify-between gap-2 sm:hidden'>
        <p className='text-xs font-medium text-muted-foreground'>Per halaman</p>
        <Select
          value={`${pageSize}`}
          onValueChange={(val) => handlePageSizeChange(Number(val))}
        >
          <SelectTrigger className='h-10 w-23 bg-transparent text-xs'>
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side='top'>
            {[10, 20, 30, 40, 50].map((size) => (
              <SelectItem key={size} value={`${size}`} className='text-xs'>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='hidden items-center justify-between sm:flex'>
        <div className='flex items-center gap-2'>
          <Select
            value={`${pageSize}`}
            onValueChange={(val) => handlePageSizeChange(Number(val))}
          >
            <SelectTrigger className='h-8 w-17.5 bg-transparent text-xs'>
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side='top'>
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`} className='text-xs'>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='text-xs font-medium text-muted-foreground'>
            Per halaman
          </p>
        </div>

        <div className='flex items-center sm:space-x-6 lg:space-x-8'>
          <div className='flex items-center justify-center text-xs font-medium text-muted-foreground'>
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className='flex items-center space-x-1 sm:space-x-2'>
            <Button
              variant='outline'
              className='hidden size-8 p-0 sm:flex'
              onClick={() => onPageChange(1)}
              disabled={!canGoPrevious}
            >
              <span className='sr-only'>Ke halaman pertama</span>
              <DoubleArrowLeftIcon className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              className='size-8 p-0'
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoPrevious}
            >
              <span className='sr-only'>Ke halaman sebelumnya</span>
              <ChevronLeftIcon className='h-4 w-4' />
            </Button>

            {pageNumbers.map((pageNumber, index) => (
              <div key={`${pageNumber}-${index}`} className='flex items-center'>
                {pageNumber === '...' ? (
                  <span className='px-1.5 text-xs text-muted-foreground'>
                    ...
                  </span>
                ) : (
                  <Button
                    variant={currentPage === pageNumber ? 'default' : 'outline'}
                    className='h-8 min-w-8 px-2 text-xs font-semibold'
                    onClick={() => onPageChange(pageNumber as number)}
                  >
                    <span className='sr-only'>Ke halaman {pageNumber}</span>
                    {pageNumber}
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant='outline'
              className='size-8 p-0'
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoNext}
            >
              <span className='sr-only'>Ke halaman berikutnya</span>
              <ChevronRightIcon className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              className='hidden size-8 p-0 sm:flex'
              onClick={() => onPageChange(totalPages)}
              disabled={!canGoNext}
            >
              <span className='sr-only'>Ke halaman terakhir</span>
              <DoubleArrowRightIcon className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

export function RealtimeAttendanceLog({ records }: RealtimeAttendanceLogProps) {
  const allRecords = records

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [kelompokFilter, setKelompokFilter] = useState<Set<string>>(new Set())
  const [kategoriFilter, setKategoriFilter] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ── Sort state ──
  type SortField =
    | 'timestamp'
    | 'name'
    | 'group'
    | 'category'
    | 'status'
    | 'permission_reason'
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortableHeader = (
    field: SortField,
    label: string,
    justifyEnd = false
  ) => {
    const isActive = sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className={cn(
          'group inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase outline-hidden transition-colors select-none hover:text-foreground',
          justifyEnd && 'w-full justify-end'
        )}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className='h-3 w-3 shrink-0 text-foreground/90' />
          ) : (
            <ArrowDown className='h-3 w-3 shrink-0 text-foreground/90' />
          )
        ) : (
          <ArrowUpDown className='h-3 w-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60' />
        )}
      </button>
    )
  }

  const isFiltered =
    searchQuery.length > 0 ||
    kelompokFilter.size > 0 ||
    kategoriFilter.size > 0 ||
    statusFilter.size > 0

  // ── Client-side filtering and sorting ──
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = allRecords.filter((r) => {
      const d = displayOf(r)

      // Search by name
      if (q && !d.name.toLowerCase().includes(q)) return false

      // Kelompok filter
      if (kelompokFilter.size > 0 && !kelompokFilter.has(d.group)) return false

      // Kategori filter (values are DB values like GPN A, GPN B, AR, APR)
      if (kategoriFilter.size > 0 && !kategoriFilter.has(d.category))
        return false

      // Status filter
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false

      return true
    })

    if (!sortField) return filtered

    return [...filtered].sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      if (sortField === 'timestamp') {
        valA = a.timestamp ? new Date(a.timestamp).getTime() : 0
        valB = b.timestamp ? new Date(b.timestamp).getTime() : 0
      } else if (sortField === 'name') {
        valA = displayOf(a).name.toLowerCase()
        valB = displayOf(b).name.toLowerCase()
      } else if (sortField === 'group') {
        valA = displayOf(a).group.toLowerCase()
        valB = displayOf(b).group.toLowerCase()
      } else if (sortField === 'category') {
        valA = displayOf(a).category.toLowerCase()
        valB = displayOf(b).category.toLowerCase()
      } else if (sortField === 'status') {
        valA = a.status.toLowerCase()
        valB = b.status.toLowerCase()
      } else if (sortField === 'permission_reason') {
        valA = (a.permission_reason || '').toLowerCase()
        valB = (b.permission_reason || '').toLowerCase()
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [
    allRecords,
    searchQuery,
    kelompokFilter,
    kategoriFilter,
    statusFilter,
    sortField,
    sortDirection,
  ])

  // ── Paginated records ──
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredRecords.slice(startIndex, startIndex + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  // ── Facet counts (computed against full, unfiltered data) ──
  const kelompokCounts = useMemo(() => {
    const m = new Map<string, number>()
    allRecords.forEach((r) => {
      const g = displayOf(r).group
      m.set(g, (m.get(g) ?? 0) + 1)
    })
    return m
  }, [allRecords])

  const kategoriCounts = useMemo(() => {
    const m = new Map<string, number>()
    allRecords.forEach((r) => {
      const c = displayOf(r).category
      m.set(c, (m.get(c) ?? 0) + 1)
    })
    return m
  }, [allRecords])

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>()
    allRecords.forEach((r) => {
      m.set(r.status, (m.get(r.status) ?? 0) + 1)
    })
    return m
  }, [allRecords])

  // ── Render ──
  return (
    <Card className='border-border/60 bg-card'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 border-b border-border/40 py-4'>
        <div className='flex flex-col gap-1'>
          <CardTitle className='flex items-center gap-2 text-sm font-semibold tracking-tight'>
            <div className='relative flex h-2 w-2 shrink-0'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/30 opacity-75' />
              <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-500' />
            </div>
            <span>Aktivitas Absensi</span>
          </CardTitle>
          <p className='max-w-[70ch] text-xs leading-relaxed font-normal text-muted-foreground'>
            Pembaruan hadir dan izin dari form yang dibagikan.
          </p>
        </div>
        <Badge
          variant='outline'
          className='shrink-0 rounded-sm border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400'
        >
          Otomatis · 15 dtk
        </Badge>
      </CardHeader>

      {/* ── Toolbar ── */}
      <div className='flex flex-col gap-2 border-b border-border/30 px-4 py-3'>
        <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
          <div className='relative w-full sm:w-50 lg:w-70'>
            <Search className='absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Cari peserta...'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className='h-10 pl-8 text-sm sm:h-8 sm:text-xs'
            />
          </div>
          <div className='flex flex-wrap gap-x-2'>
            <FacetedFilter
              title='Kelompok'
              options={KELOMPOK_OPTIONS}
              selected={kelompokFilter}
              onChange={(value) => {
                setKelompokFilter(value)
                setCurrentPage(1)
              }}
              counts={kelompokCounts}
            />
            <FacetedFilter
              title='Kategori'
              options={KATEGORI_OPTIONS}
              selected={kategoriFilter}
              onChange={(value) => {
                setKategoriFilter(value)
                setCurrentPage(1)
              }}
              counts={kategoriCounts}
            />
            <FacetedFilter
              title='Status'
              options={STATUS_OPTIONS}
              selected={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
              counts={statusCounts}
            />
          </div>
          {isFiltered && (
            <Button
              variant='ghost'
              onClick={() => {
                setSearchQuery('')
                setKelompokFilter(new Set())
                setKategoriFilter(new Set())
                setStatusFilter(new Set())
              }}
              className='h-10 px-2 text-xs sm:h-8 lg:px-3'
            >
              Reset
              <X className='ms-2 h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      <CardContent className='p-0'>
        {filteredRecords.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16 text-center text-muted-foreground'>
            <div className='mb-2.5 rounded-full bg-muted p-2.5'>
              <Activity className='h-5 w-5 text-muted-foreground' />
            </div>
            <p className='text-xs font-medium'>
              {isFiltered
                ? 'Tidak ada data yang cocok dengan filter'
                : 'Belum ada aktivitas absensi'}
            </p>
            {!isFiltered && (
              <p className='mt-0.5 text-[10px] text-muted-foreground/80'>
                Menunggu pencatatan absensi terbaru...
              </p>
            )}
          </div>
        ) : (
          <>
            <div className='divide-y divide-border/40 md:hidden'>
              {paginatedRecords.map((record) => (
                <AttendanceActivityItem key={record.id} record={record} />
              ))}
            </div>

            <div className='hidden overflow-x-auto md:block'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-32.5 py-3 ps-4'>
                      {renderSortableHeader('timestamp', 'Tanggal')}
                    </TableHead>
                    <TableHead className='w-22.5 py-3 text-right'>
                      {renderSortableHeader('timestamp', 'Waktu', true)}
                    </TableHead>
                    <TableHead className='py-3'>
                      {renderSortableHeader('name', 'Nama Peserta')}
                    </TableHead>
                    <TableHead className='py-3'>
                      {renderSortableHeader('group', 'Kelompok')}
                    </TableHead>
                    <TableHead className='py-3'>
                      {renderSortableHeader('category', 'Kategori')}
                    </TableHead>
                    <TableHead className='py-3'>
                      {renderSortableHeader('status', 'Status')}
                    </TableHead>
                    <TableHead className='py-3 pe-4'>
                      {renderSortableHeader('permission_reason', 'Alasan Izin')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => {
                    const dateObj = record.timestamp
                      ? new Date(record.timestamp)
                      : new Date()
                    const dateStr = format(dateObj, 'dd MMM yyyy', {
                      locale: idLocale,
                    })
                    const timeStr = format(dateObj, 'HH:mm')

                    const isHadir = record.status === 'HADIR'
                    const statusLabel = isHadir ? 'Hadir' : 'Izin'

                    const d = displayOf(record)

                    return (
                      <TableRow
                        key={record.id}
                        className='slide-in-from-top-1.5 animate-in transition-all duration-200 fade-in hover:bg-muted/30'
                      >
                        <TableCell className='ps-4 text-xs font-medium text-foreground/90 tabular-nums'>
                          {dateStr}
                        </TableCell>
                        <TableCell className='text-right text-xs text-muted-foreground tabular-nums'>
                          {timeStr}
                        </TableCell>
                        <TableCell className='py-2.5'>
                          <div className='flex flex-col'>
                            <span className='text-xs font-semibold text-foreground'>
                              {d.name}
                            </span>
                            {!record.participant_id && record.temp_name && (
                              <span className='text-[10px] font-medium text-amber-600'>
                                (Belum terhubung)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-xs text-foreground/80'>
                          {d.group}
                        </TableCell>
                        <TableCell className='text-xs'>
                          {d.category && d.category !== '-' ? (
                            <Badge
                              variant='outline'
                              className='rounded-sm border-border/70 px-2 py-0 text-[10px] font-semibold text-foreground/85'
                            >
                              {d.category}
                            </Badge>
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                        <TableCell className='text-xs'>
                          <Badge
                            variant='outline'
                            className={cn(
                              'rounded-sm border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                              isHadir
                                ? 'border-teal-200/50 bg-teal-100/30 text-teal-900 dark:border-teal-800/30 dark:text-teal-200'
                                : 'border-amber-200/50 bg-amber-100/30 text-amber-900 dark:border-amber-800/30 dark:text-amber-200'
                            )}
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className='py-2 pe-4 text-xs'>
                          <div className='flex flex-col gap-0.5'>
                            <span className='font-medium text-foreground/90'>
                              {record.permission_reason || '-'}
                            </span>
                            {record.permission_description && (
                              <span className='max-w-60 text-[10px] leading-relaxed wrap-break-word whitespace-pre-wrap text-muted-foreground'>
                                {record.permission_description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <LogPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={filteredRecords.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
