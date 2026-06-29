'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { id as idLocale } from 'date-fns/locale'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Merge,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { type PendingParticipant, type Participant } from '@/lib/schema'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableBulkActions,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { TableSkeleton } from '@/components/data-table/table-skeleton'
import { PermissionGate } from '@/components/permission-gate'
import { formatKategoriLabel } from '../approval-utils'
import { approvalService } from '../services'
import { useApprovals } from './approvals-provider'
import { PendingReviewDrawer } from './pending-review-drawer'

const checkDuplicate = (pendingName: string, activeList: Participant[]) => {
  const normPending = pendingName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!normPending) return null

  // Exact match (spaces & special chars stripped)
  const exact = activeList.find((p) => {
    const normActive = p.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    return normActive === normPending
  })
  if (exact) return { type: 'exact' as const, match: exact }

  // Similar match
  const similar = activeList.find((p) => {
    const normActive = p.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normActive.includes(normPending) || normPending.includes(normActive)) return true

    const pWords = pendingName.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const aWords = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    if (pWords.length > 0 && aWords.length > 0) {
      const common = pWords.filter((w) => aWords.includes(w))
      if (common.length >= 2) return true
      if (pWords.length === 1 && aWords.length === 1 && pWords[0] === aWords[0]) return true
    }
    return false
  })

  if (similar) return { type: 'similar' as const, match: similar }
  return null
}

export function PendingParticipantsTab() {
  const { setRefreshData } = useApprovals()
  const { can } = usePermissions()
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [selectedPending, setSelectedPending] =
    useState<PendingParticipant | null>(null)
  const [mergeTarget, setMergeTarget] = useState<string | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [rejectConfirm, setRejectConfirm] = useState<PendingParticipant | null>(
    null
  )
  const [approveConfirm, setApproveConfirm] =
    useState<PendingParticipant | null>(null)
  const [reviewTarget, setReviewTarget] = useState<PendingParticipant | null>(
    null
  )
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const [rowSelection, setRowSelection] = useState({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [bulkApproveConfirm, setBulkApproveConfirm] = useState<
    PendingParticipant[]
  >([])
  const [bulkRejectConfirm, setBulkRejectConfirm] = useState<
    PendingParticipant[]
  >([])

  const queryClient = useQueryClient()
  const pendingQuery = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: approvalService.getPending,
  })
  const participantsQuery = useQuery({
    queryKey: ['approvals', 'activeParticipants'],
    queryFn: approvalService.getActiveParticipants,
  })

  const pendingList = useMemo(
    () => (pendingQuery.data ?? []) as PendingParticipant[],
    [pendingQuery.data]
  )
  const participants = useMemo(
    () => (participantsQuery.data ?? []) as Participant[],
    [participantsQuery.data]
  )

  useEffect(() => {
    setRefreshData(() => () => {
      void queryClient.invalidateQueries({ queryKey: ['approvals'] })
    })
  }, [queryClient, setRefreshData])

  useEffect(() => {
    if (pendingQuery.error || participantsQuery.error) {
      toast.error('Gagal memuat data persetujuan')
    }
  }, [pendingQuery.error, participantsQuery.error])

  const executeApproveNew = async (pending: PendingParticipant) => {
    try {
      await approvalService.approve(pending, true)
      toast.success(`Peserta "${pending.name}" berhasil ditambahkan`)
      void queryClient.invalidateQueries({ queryKey: ['approvals'] })
    } catch (_error) {
      toast.error('Gagal menyetujui peserta')
    }
    setApproveConfirm(null)
  }

  const handleApproveMerge = async () => {
    if (!selectedPending || !mergeTarget) return

    try {
      await approvalService.approve(selectedPending, false, mergeTarget)
      const targetParticipant = participants.find((p) => p.id === mergeTarget)
      toast.success(
        `Absensi berhasil dihubungkan ke "${targetParticipant?.name}"`
      )
      setApproveDialogOpen(false)
      setSelectedPending(null)
      setMergeTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['approvals'] })
    } catch (_error) {
      toast.error('Gagal menghubungkan data')
    }
  }

  const executeReject = async (pending: PendingParticipant) => {
    try {
      await approvalService.reject(pending.id)
      toast.success(`Pengajuan "${pending.name}" ditolak`)
      void queryClient.invalidateQueries({ queryKey: ['approvals'] })
    } catch (_error) {
      toast.error('Gagal menolak pengajuan')
    }
    setRejectConfirm(null)
  }

  const openMergeDialog = useCallback((pending: PendingParticipant) => {
    setSelectedPending(pending)
    const matchResult = checkDuplicate(pending.name, participants)
    if (matchResult) {
      setMergeTarget(matchResult.match.id)
    } else {
      setMergeTarget(null)
    }
    setApproveDialogOpen(true)
  }, [participants])

  const executeBulkApprove = async (items: PendingParticipant[]) => {
    let ok = 0
    let fail = 0
    for (const p of items) {
      try {
        await approvalService.approve(p, true)
        ok++
      } catch (_e) {
        fail++
      }
    }
    if (ok > 0) toast.success(`${ok} pengajuan disetujui`)
    if (fail > 0) toast.error(`${fail} pengajuan gagal`)
    void queryClient.invalidateQueries({ queryKey: ['approvals'] })
    setBulkApproveConfirm([])
    setRowSelection({})
  }

  const executeBulkReject = async (items: PendingParticipant[]) => {
    let ok = 0
    let fail = 0
    for (const p of items) {
      try {
        await approvalService.reject(p.id)
        ok++
      } catch (_e) {
        fail++
      }
    }
    if (ok > 0) toast.success(`${ok} pengajuan ditolak`)
    if (fail > 0) toast.error(`${fail} pengajuan gagal ditolak`)
    void queryClient.invalidateQueries({ queryKey: ['approvals'] })
    setBulkRejectConfirm([])
    setRowSelection({})
  }

  const columns = useMemo<ColumnDef<PendingParticipant>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label='Pilih semua baris di halaman ini'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label='Pilih baris'
            onClick={(e) => e.stopPropagation()}
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
          <span className='font-medium'>{row.original.name}</span>
        ),
      },
      {
        id: 'validation',
        header: 'Validasi Data',
        cell: ({ row }) => {
          const matchResult = checkDuplicate(row.original.name, participants)
          if (!matchResult) {
            return (
              <Badge variant='outline' className='border-emerald-500 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50/50'>
                Data Baru
              </Badge>
            )
          }

          const isExact = matchResult.type === 'exact'
          const m = matchResult.match

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openMergeDialog(row.original)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border cursor-pointer transition-colors',
                      isExact
                        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    )}
                  >
                    {isExact ? 'Duplikat' : 'Potensi Duplikat'}
                  </button>
                </TooltipTrigger>
                <TooltipContent align='start' className='max-w-[280px] p-2 text-xs'>
                  <div className='space-y-1 text-left'>
                    <p className='font-semibold'>
                      {isExact
                        ? 'Nama sama persis ditemukan di database:'
                        : 'Nama mirip ditemukan di database:'}
                    </p>
                    <p className='text-muted-foreground'>
                      • {m.name} ({m.kelompok || 'Tanpa Kelompok'} - {formatKategoriLabel(m.kategori)})
                    </p>
                    <p className='text-[10px] text-muted-foreground italic mt-1'>
                      Klik tombol ini untuk membuka dialog gabungkan data.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
      },
      {
        accessorKey: 'suggestedKelompok',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Kelompok' />
        ),
        filterFn: (row, id, value: string[]) =>
          value.length === 0 ? true : value.includes(row.getValue<string>(id)),
      },
      {
        accessorKey: 'suggestedKategori',
        header: 'Kategori',
        cell: ({ row }) => (
          <Badge variant='outline'>
            {formatKategoriLabel(row.original.suggestedKategori)}
          </Badge>
        ),
      },
      {
        accessorKey: 'suggestedGender',
        header: 'Jenis Kelamin',
        cell: ({ row }) =>
          row.original.suggestedGender === 'L' ? 'Laki-laki' : 'Perempuan',
      },
      {
        id: 'attendanceCount',
        accessorFn: (r) => r.attendanceRefIds.length,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Absensi' />
        ),
        cell: ({ row }) => (
          <span className='tabular-nums'>
            {row.original.attendanceRefIds.length}
          </span>
        ),
        sortingFn: (a, b) =>
          a.original.attendanceRefIds.length -
          b.original.attendanceRefIds.length,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Diajukan' />
        ),
        cell: ({ row }) => (
          <span className='tabular-nums'>
            {format(row.original.createdAt, 'dd MMM yyyy', {
              locale: idLocale,
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Aksi</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={(e) => {
                e.stopPropagation()
                setReviewTarget(row.original)
              }}
            >
              Tinjau lengkap
            </Button>
          </div>
        ),
      },
    ],
    [participants, openMergeDialog]
  )

  const kelompokOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of pendingList) set.add(p.suggestedKelompok)
    return Array.from(set)
      .sort()
      .map((v) => ({ label: v, value: v }))
  }, [pendingList])

   
  const table = useReactTable({
    data: pendingList,
    columns,
    state: { rowSelection, columnFilters, sorting },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (pendingQuery.isLoading) {
    return (
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-8' />
              <TableHead>Nama</TableHead>
              <TableHead>Kelompok</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Jenis Kelamin</TableHead>
              <TableHead>Absensi</TableHead>
              <TableHead>Diajukan</TableHead>
              <TableHead className='text-right'>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableSkeleton columns={8} />
        </Table>
      </div>
    )
  }

  if (pendingList.length === 0) {
    return (
      <div className='rounded-md border border-dashed p-10 text-center'>
        <p className='text-sm text-muted-foreground'>
          Tidak ada pengajuan peserta baru.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className='space-y-4'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Cari nama pengajuan...'
          searchKey='name'
          filters={[
            {
              columnId: 'suggestedKelompok',
              title: 'Kelompok',
              options: kelompokOptions,
            },
          ]}
        />

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                  <TableHead className='w-8' />
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
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
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length + 1}
                    className='h-24 text-center text-muted-foreground'
                  >
                    Tidak ada pengajuan yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const pending = row.original
                  const isExpanded = expandedRow === pending.id
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        className='cursor-pointer'
                        data-state={
                          row.getIsSelected() ? 'selected' : undefined
                        }
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : pending.id)
                        }
                      >
                        <TableCell className='w-8'>
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </TableCell>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && (
                        <TableRow className='bg-muted/30 hover:bg-muted/30'>
                          <TableCell />
                          <TableCell
                            colSpan={row.getVisibleCells().length}
                            className='py-3'
                          >
                            <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                              <DetailField
                                label='Tgl lahir'
                                value={
                                  pending.birthDate
                                    ? format(pending.birthDate, 'dd MMM yyyy', {
                                        locale: idLocale,
                                      })
                                    : '—'
                                }
                              />
                              <DetailField
                                label='Tempat lahir'
                                value={pending.birthPlace ?? '—'}
                              />
                              <DetailField
                                label='Jam diajukan'
                                value={format(pending.createdAt, 'HH:mm', {
                                  locale: idLocale,
                                })}
                              />
                              <DetailField
                                label='Absensi terhubung'
                                value={`${pending.attendanceRefIds.length} entri`}
                              />
                            </div>
                            <PermissionGate allowed={can.approveParticipant}>
                              <div className='mt-3 flex flex-wrap gap-2'>
                                <Button
                                  type='button'
                                  size='sm'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setApproveConfirm(pending)
                                  }}
                                >
                                  <Check className='mr-1.5 h-3.5 w-3.5' />{' '}
                                  Setujui baru
                                </Button>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='outline'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openMergeDialog(pending)
                                  }}
                                >
                                  <Merge className='mr-1.5 h-3.5 w-3.5' />{' '}
                                  Gabungkan
                                </Button>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='ghost'
                                  className='text-destructive hover:text-destructive'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRejectConfirm(pending)
                                  }}
                                >
                                  <X className='mr-1.5 h-3.5 w-3.5' /> Tolak
                                </Button>
                              </div>
                            </PermissionGate>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} />
      </div>

      <DataTableBulkActions table={table} entityName='pengajuan'>
        <PermissionGate allowed={can.approveParticipant}>
          <Button
            size='sm'
            onClick={() =>
              setBulkApproveConfirm(
                table.getFilteredSelectedRowModel().rows.map((r) => r.original)
              )
            }
          >
            <Check className='mr-1 h-3.5 w-3.5' /> Setujui semua
          </Button>
          <Button
            size='sm'
            variant='ghost'
            className='text-destructive hover:text-destructive'
            onClick={() =>
              setBulkRejectConfirm(
                table.getFilteredSelectedRowModel().rows.map((r) => r.original)
              )
            }
          >
            <X className='mr-1 h-3.5 w-3.5' /> Tolak semua
          </Button>
        </PermissionGate>
      </DataTableBulkActions>

      <ConfirmDialog
        open={!!rejectConfirm}
        onOpenChange={(open) => !open && setRejectConfirm(null)}
        title='Tolak pengajuan peserta?'
        desc={
          <>
            Pengajuan <strong>{rejectConfirm?.name}</strong> akan ditolak dan
            dihapus dari antrean. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        destructive
        confirmText='Tolak pengajuan'
        cancelBtnText='Batal'
        handleConfirm={() => rejectConfirm && void executeReject(rejectConfirm)}
      />

      <ConfirmDialog
        open={!!approveConfirm}
        onOpenChange={(open) => !open && setApproveConfirm(null)}
        title='Setujui sebagai peserta baru?'
        desc={
          <>
            <strong>{approveConfirm?.name}</strong> akan ditambahkan sebagai
            peserta baru di kelompok {approveConfirm?.suggestedKelompok},
            kategori{' '}
            {approveConfirm
              ? formatKategoriLabel(approveConfirm.suggestedKategori)
              : '—'}
            .
          </>
        }
        confirmText='Ya, setujui'
        cancelBtnText='Batal'
        handleConfirm={() =>
          approveConfirm && void executeApproveNew(approveConfirm)
        }
      />

      <ConfirmDialog
        open={bulkApproveConfirm.length > 0}
        onOpenChange={(open) => !open && setBulkApproveConfirm([])}
        title={`Setujui ${bulkApproveConfirm.length} pengajuan?`}
        desc={
          <>
            {bulkApproveConfirm.length} pengajuan akan ditambahkan sebagai
            peserta baru. Pastikan data-nya sesuai.
          </>
        }
        confirmText='Ya, setujui semua'
        cancelBtnText='Batal'
        handleConfirm={() => void executeBulkApprove(bulkApproveConfirm)}
      />

      <ConfirmDialog
        open={bulkRejectConfirm.length > 0}
        onOpenChange={(open) => !open && setBulkRejectConfirm([])}
        title={`Tolak ${bulkRejectConfirm.length} pengajuan?`}
        desc={
          <>
            {bulkRejectConfirm.length} pengajuan akan ditolak dan dihapus dari
            antrean. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        destructive
        confirmText='Tolak semua'
        cancelBtnText='Batal'
        handleConfirm={() => void executeBulkReject(bulkRejectConfirm)}
      />

      <PendingReviewDrawer
        pending={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onApprove={(p) => {
          setReviewTarget(null)
          setApproveConfirm(p)
        }}
        onMerge={(p) => {
          setReviewTarget(null)
          openMergeDialog(p)
        }}
        onReject={(p) => {
          setReviewTarget(null)
          setRejectConfirm(p)
        }}
      />

      <Dialog
        open={approveDialogOpen}
        onOpenChange={(open) => {
          setApproveDialogOpen(open)
          if (!open) setMergeTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gabungkan ke Peserta yang Ada</DialogTitle>
            <DialogDescription>
              Hubungkan absensi dan lengkapi tempat/tanggal lahir yang masih
              kosong pada peserta terdaftar.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Popover modal={true} open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={openCombobox}
                  className='w-full justify-between'
                >
                  {mergeTarget
                    ? participants.find((p) => p.id === mergeTarget)?.name
                    : 'Pilih peserta...'}
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0' align='start'>
                <Command>
                  <CommandInput placeholder='Cari peserta...' />
                  <CommandList>
                    <CommandEmpty>Peserta tidak ditemukan</CommandEmpty>
                    <CommandGroup>
                      {participants.map((participant) => (
                        <CommandItem
                          key={participant.id}
                          value={`${participant.name} ${participant.kelompok}`}
                          onSelect={() => {
                            setMergeTarget(participant.id)
                            setOpenCombobox(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              mergeTarget === participant.id
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <div className='flex flex-col'>
                            <span>{participant.name}</span>
                            <span className='text-xs text-muted-foreground'>
                              {participant.kelompok} -{' '}
                              {formatKategoriLabel(participant.kategori)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setApproveDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleApproveMerge} disabled={!mergeTarget}>
              Gabungkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
        {label}
      </span>
      <span className='text-sm font-medium'>{value}</span>
    </div>
  )
}
