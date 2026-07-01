import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  PlusCircledIcon,
} from '@radix-ui/react-icons'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Activity, ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react'
import {
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
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
import { cn, getPageNumbers } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────

interface RealtimeAttendanceLogProps {
  forms: Array<{ id: string; title: string; date: string }>
}

interface DBAttendanceRow {
  id: string
  form_id: string
  participant_id: string | null
  status: string
  timestamp: string | null
  is_pending: boolean | null
  temp_name: string | null
  temp_category: string | null
  temp_gender: string | null
  temp_group: string | null
  permission_reason: string | null
  permission_description: string | null
}

interface JoinedParticipant {
  id: string
  name: string
  gender: 'L' | 'P' | null
  group: { value: string } | null
  category: { value: string } | null
}

interface DBAttendanceWithParticipant {
  id: string
  form_id: string
  status: string
  timestamp: string | null
  is_pending: boolean | null
  permission_reason: string | null
  permission_description: string | null
  temp_name: string | null
  temp_category: string | null
  temp_gender: string | null
  temp_group: string | null
  participant: {
    id: string
    name: string
    gender: string | null
    group_id: string | null
    category_id: string | null
    group: unknown
    category: unknown
  } | null
}

interface LogAttendanceRecord {
  id: string
  form_id: string
  status: 'HADIR' | 'IZIN'
  timestamp: string
  is_pending: boolean
  permission_reason: string | null
  permission_description: string | null
  temp_name: string | null
  temp_category: string | null
  temp_gender: string | null
  temp_group: string | null
  participant: JoinedParticipant | null
}

// ── Helpers ────────────────────────────────────────────────────────────

function resolveLookup(val: unknown): { value: string } | null {
  if (!val) return null
  if (Array.isArray(val)) return (val[0] as { value: string }) || null
  return val as { value: string }
}

function mapRow(row: DBAttendanceWithParticipant): LogAttendanceRecord {
  return {
    id: row.id,
    form_id: row.form_id,
    status: row.status as 'HADIR' | 'IZIN',
    timestamp: row.timestamp ?? '',
    is_pending: !!row.is_pending,
    permission_reason: row.permission_reason,
    permission_description: row.permission_description,
    temp_name: row.temp_name,
    temp_category: row.temp_category,
    temp_gender: row.temp_gender,
    temp_group: row.temp_group,
    participant: row.participant
      ? {
        id: row.participant.id,
        name: row.participant.name,
        gender: row.participant.gender as 'L' | 'P' | null,
        group: resolveLookup(row.participant.group),
        category: resolveLookup(row.participant.category),
      }
      : null,
  }
}

/** Derive the display group/category/name for a record */
function displayOf(r: LogAttendanceRecord) {
  return {
    name: r.participant?.name || r.temp_name || '-',
    group: r.participant?.group?.value || r.temp_group || '-',
    category: r.participant?.category?.value || r.temp_category || '-',
  }
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
        <Button variant='outline' size='sm' className='h-8 border-dashed text-xs'>
          <PlusCircledIcon className='size-4' />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <Badge
                variant='secondary'
                className='rounded-sm px-1 font-normal lg:hidden text-[10px]'
              >
                {selected.size}
              </Badge>
              <div className='hidden space-x-1 lg:flex'>
                {selected.size > 2 ? (
                  <Badge
                    variant='secondary'
                    className='rounded-sm px-1 font-normal text-[10px]'
                  >
                    {selected.size} dipilih
                  </Badge>
                ) : (
                  options
                    .filter((o) => selected.has(o.value))
                    .map((o) => (
                      <Badge
                        variant='secondary'
                        key={o.value}
                        className='rounded-sm px-1 font-normal text-[10px]'
                      >
                        {o.label}
                      </Badge>
                    ))
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
                        'flex size-4 items-center justify-center rounded-sm border border-primary mr-2',
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

  return (
    <div className='flex items-center justify-between overflow-clip px-2 @max-2xl/content:flex-col-reverse @max-2xl/content:gap-4 py-3 border-t border-border/40'>
      <div className='flex items-center gap-2'>
        <Select
          value={`${pageSize}`}
          onValueChange={(val) => onPageSizeChange(Number(val))}
        >
          <SelectTrigger className='h-8 w-[70px] text-xs bg-transparent'>
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
        <p className='text-xs font-medium text-muted-foreground'>Rows per page</p>
      </div>

      <div className='flex items-center sm:space-x-6 lg:space-x-8'>
        <div className='flex items-center justify-center text-xs font-medium text-muted-foreground'>
          Page {currentPage} of {totalPages}
        </div>
        <div className='flex items-center space-x-1 sm:space-x-2'>
          <Button
            variant='outline'
            className='size-8 p-0 hidden sm:flex'
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <span className='sr-only'>Go to first page</span>
            <DoubleArrowLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <span className='sr-only'>Go to previous page</span>
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>

          {/* Page number buttons */}
          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className='flex items-center'>
              {pageNumber === '...' ? (
                <span className='px-1.5 text-xs text-muted-foreground'>...</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className='h-8 min-w-8 px-2 text-xs font-semibold'
                  onClick={() => onPageChange(pageNumber as number)}
                >
                  <span className='sr-only'>Go to page {pageNumber}</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant='outline'
            className='size-8 p-0'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <span className='sr-only'>Go to next page</span>
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0 hidden sm:flex'
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <span className='sr-only'>Go to last page</span>
            <DoubleArrowRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────


const SELECT_QUERY = `
  id,
  form_id,
  status,
  timestamp,
  is_pending,
  permission_reason,
  permission_description,
  temp_name,
  temp_category,
  temp_gender,
  temp_group,
  participant:participants!attendance_participant_id_fkey(
    id,
    name,
    gender,
    group_id,
    category_id,
    group:group_id(value),
    category:category_id(value)
  )
`

export function RealtimeAttendanceLog({ forms }: RealtimeAttendanceLogProps) {
  const [allRecords, setAllRecords] = useState<LogAttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [kelompokFilter, setKelompokFilter] = useState<Set<string>>(new Set())
  const [kategoriFilter, setKategoriFilter] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, kelompokFilter, kategoriFilter, statusFilter])

  // ── Sort state ──
  type SortField = 'timestamp' | 'name' | 'group' | 'category' | 'status' | 'permission_reason'
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

  const renderSortableHeader = (field: SortField, label: string, justifyEnd = false) => {
    const isActive = sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className={cn(
          'group inline-flex items-center gap-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer select-none bg-transparent border-none p-0 outline-hidden',
          justifyEnd && 'justify-end w-full'
        )}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className='h-3 w-3 text-foreground/90 shrink-0' />
          ) : (
            <ArrowDown className='h-3 w-3 text-foreground/90 shrink-0' />
          )
        ) : (
          <ArrowUpDown className='h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0' />
        )}
      </button>
    )
  }

  const isFiltered =
    searchQuery.length > 0 ||
    kelompokFilter.size > 0 ||
    kategoriFilter.size > 0 ||
    statusFilter.size > 0

  // ── Fetch ALL attendance records ──
  useEffect(() => {
    if (forms.length === 0) {
      setAllRecords([])
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchAll() {
      setIsLoading(true)
      try {
        const formIds = forms.map((f) => f.id)
        const { data, error } = await supabase
          .from('attendance')
          .select(SELECT_QUERY)
          .in('form_id', formIds)
          .eq('is_pending', false)
          .order('timestamp', { ascending: false })

        if (error) throw error
        if (cancelled) return

        const mapped = (
          (data as unknown as DBAttendanceWithParticipant[]) || []
        ).map(mapRow)

        setAllRecords(mapped)
      } catch (_err) {
        // silently fail on public page
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [forms])

  // ── Realtime subscriptions ──
  const handleRealtimeEvent = useCallback(
    async (payload: RealtimePostgresChangesPayload<DBAttendanceRow>) => {
      if (payload.eventType === 'DELETE') {
        const oldId = payload.old.id
        if (oldId) {
          setAllRecords((cur) => cur.filter((r) => r.id !== oldId))
        }
        return
      }

      const raw = payload.new
      if (!raw?.id) return

      if (raw.is_pending) {
        setAllRecords((cur) => cur.filter((r) => r.id !== raw.id))
        return
      }

      // Fetch participant details
      let participantData: JoinedParticipant | null = null
      if (raw.participant_id) {
        try {
          const { data: p, error } = await supabase
            .from('participants')
            .select(
              `
              id, name, gender, group_id, category_id,
              group:group_id(value),
              category:category_id(value)
            `
            )
            .eq('id', raw.participant_id)
            .single()

          if (!error && p) {
            participantData = {
              id: p.id,
              name: p.name,
              gender: p.gender as 'L' | 'P' | null,
              group: resolveLookup(p.group),
              category: resolveLookup(p.category),
            }
          }
        } catch (_e) {
          /* noop */
        }
      }

      const mapped: LogAttendanceRecord = {
        id: raw.id,
        form_id: raw.form_id,
        status: raw.status as 'HADIR' | 'IZIN',
        timestamp: raw.timestamp ?? '',
        is_pending: !!raw.is_pending,
        permission_reason: raw.permission_reason,
        permission_description: raw.permission_description,
        temp_name: raw.temp_name,
        temp_category: raw.temp_category,
        temp_gender: raw.temp_gender,
        temp_group: raw.temp_group,
        participant: participantData,
      }

      setAllRecords((cur) => {
        const exists = cur.some((r) => r.id === mapped.id)
        const updated = exists
          ? cur.map((r) => (r.id === mapped.id ? mapped : r))
          : [mapped, ...cur]
        return updated.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      })
    },
    []
  )

  useEffect(() => {
    if (forms.length === 0) return

    const channels: RealtimeChannel[] = []

    forms.forEach((form) => {
      const channel = supabase
        .channel(`realtime-attendance-${form.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance',
            filter: `form_id=eq.${form.id}`,
          },
          handleRealtimeEvent
        )
        .subscribe()
      channels.push(channel)
    })

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [forms, handleRealtimeEvent])

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
  }, [allRecords, searchQuery, kelompokFilter, kategoriFilter, statusFilter, sortField, sortDirection])

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
    <Card className='border-border/60 bg-card/45 backdrop-blur-md'>
      <CardHeader className='flex flex-row items-start justify-between py-4 border-b border-border/40 gap-4'>
        <div className='flex flex-col gap-1'>
          <CardTitle className='text-sm font-semibold tracking-tight flex items-center gap-2'>
            <div className='relative flex h-2 w-2 shrink-0'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/30 opacity-75' />
              <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-500' />
            </div>
            <span>Attendance Activity Log</span>
          </CardTitle>
          <p className='text-xs text-muted-foreground font-normal leading-relaxed max-w-[70ch]'>
            Real-time stream of check-ins and attendance updates submitted from all groups.
          </p>
        </div>
        <Badge
          variant='outline'
          className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase rounded-sm shrink-0'
        >
          Live Feed
        </Badge>
      </CardHeader>

      {/* ── Toolbar ── */}
      <div className='flex flex-col gap-2 px-4 py-3 border-b border-border/30'>
        <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
          <div className='relative w-full sm:w-[200px] lg:w-[280px]'>
            <Search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Cari peserta...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-8 pl-8 text-xs'
            />
          </div>
          <div className='flex gap-x-2 flex-wrap'>
            <FacetedFilter
              title='Kelompok'
              options={KELOMPOK_OPTIONS}
              selected={kelompokFilter}
              onChange={setKelompokFilter}
              counts={kelompokCounts}
            />
            <FacetedFilter
              title='Kategori'
              options={KATEGORI_OPTIONS}
              selected={kategoriFilter}
              onChange={setKategoriFilter}
              counts={kategoriCounts}
            />
            <FacetedFilter
              title='Status'
              options={STATUS_OPTIONS}
              selected={statusFilter}
              onChange={setStatusFilter}
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
              className='h-8 px-2 lg:px-3 text-xs'
            >
              Reset
              <X className='ms-2 h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      <CardContent className='p-0'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground'>
            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-primary mb-2' />
            <p className='text-xs font-medium'>Memuat data aktivitas...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16 text-center text-muted-foreground'>
            <div className='rounded-full bg-muted p-2.5 mb-2.5'>
              <Activity className='h-5 w-5 text-muted-foreground' />
            </div>
            <p className='text-xs font-medium'>
              {isFiltered
                ? 'Tidak ada data yang cocok dengan filter'
                : 'Belum ada aktivitas absensi'}
            </p>
            {!isFiltered && (
              <p className='text-[10px] text-muted-foreground/80 mt-0.5'>
                Menunggu pencatatan absensi secara langsung...
              </p>
            )}
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[130px] ps-4 py-3'>
                    {renderSortableHeader('timestamp', 'Tanggal')}
                  </TableHead>
                  <TableHead className='w-[90px] py-3 text-right'>
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
                  <TableHead className='pe-4 py-3'>
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
                      className='hover:bg-muted/30 transition-all duration-200 animate-in fade-in slide-in-from-top-1.5'
                    >
                      <TableCell className='ps-4 font-medium text-xs text-foreground/90 tabular-nums'>
                        {dateStr}
                      </TableCell>
                      <TableCell className='text-right text-xs text-muted-foreground tabular-nums'>
                        {timeStr}
                      </TableCell>
                      <TableCell className='py-2.5'>
                        <div className='flex flex-col'>
                          <span className='font-semibold text-xs text-foreground'>
                            {d.name}
                          </span>
                          {!record.participant && record.temp_name && (
                            <span className='text-[10px] text-amber-600 font-medium'>
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
                            className='text-[10px] font-semibold px-2 py-0 border-border/70 text-foreground/85 rounded-sm'
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
                            'text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide border uppercase',
                            isHadir
                              ? 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200/50 dark:border-teal-800/30'
                              : 'bg-amber-100/30 text-amber-900 dark:text-amber-200 border-amber-200/50 dark:border-amber-800/30'
                          )}
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className='pe-4 text-xs py-2'>
                        <div className='flex flex-col gap-0.5'>
                          <span className='font-medium text-foreground/90'>
                            {record.permission_reason || '-'}
                          </span>
                          {record.permission_description && (
                            <span className='text-[10px] text-muted-foreground whitespace-pre-wrap wrap-break-word leading-relaxed max-w-[240px]'>
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
            <LogPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={filteredRecords.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
