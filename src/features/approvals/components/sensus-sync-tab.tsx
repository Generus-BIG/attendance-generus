'use client'

import { Fragment, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { isSyncAutoPromoted } from '@/features/sensus-sync/auto-promote'
import {
  applySensusSyncItems,
  deleteSensusRun,
  listSensusItems,
  listSensusRuns,
  type SensusSyncCandidate,
  type SensusSyncItem,
} from '@/features/sensus-sync/services'
import { formatKategoriLabel } from '../approval-utils'

const confidenceLabels = {
  exact: 'Exact',
  similar: 'Similar',
  none: 'New',
} as const

function confidenceClass(confidence: SensusSyncItem['confidence']) {
  return confidence === 'exact'
    ? 'border-green-200 bg-green-50 text-green-700'
    : confidence === 'similar'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-blue-200 bg-blue-50 text-blue-700'
}

function isPending(item: SensusSyncItem) {
  return item.status === 'pending'
}

// Candidate-bearing rows need an explicit participant before apply. Pure new
// rows (no candidates) remain legitimate creates.
function isAppliable(item: SensusSyncItem) {
  return (
    isPending(item) &&
    (item.matched_participant_id !== null ||
      (item.patch.candidates?.length ?? 0) === 0)
  )
}

// Expanded-row diff field: unchanged values render quiet; changed ones show
// "old → new" with the incoming value emphasized.
function ExpandField({
  label,
  from,
  to,
}: {
  label: string
  from?: string
  to: string
}) {
  const changed = from !== undefined && from !== to
  return (
    <div className='min-w-0'>
      <div className='text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase'>
        {label}
      </div>
      <div className='mt-0.5 truncate tabular-nums' title={to}>
        {changed ? (
          <>
            <span className='text-muted-foreground'>{from}</span>
            <span className='mx-1.5 text-muted-foreground' aria-hidden='true'>
              →
            </span>
            <span className='font-medium text-foreground'>{to}</span>
          </>
        ) : (
          <span className='text-foreground/80'>{to}</span>
        )}
      </div>
    </div>
  )
}

export function SensusSyncTab({ runId }: { runId?: string }) {
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const [pickedRun, setPickedRun] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [kelompok, setGroup] = useState('all')
  const [confidence, setConfidence] = useState('all')
  const [status, setStatus] = useState('all')
  const [khusus, setKhusus] = useState('all')
  const [name, setName] = useState('')
  const [savingMatch, setSavingMatch] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingRun, setDeletingRun] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'apply' | 'reject' | null>(
    null
  )
  const [actionBusy, setActionBusy] = useState(false)

  const runsQuery = useQuery({
    queryKey: ['sensus-sync', 'runs'],
    queryFn: listSensusRuns,
    enabled: can.syncSensus,
  })
  // A stale ?run= URL id (deleted run) must not stick — fall through to newest.
  const selectedRun =
    pickedRun ||
    (runsQuery.data?.some((run) => run.id === runId) ? (runId ?? '') : '') ||
    runsQuery.data?.[0]?.id ||
    ''
  const selectedRunLabel = runsQuery.data?.find((run) => run.id === selectedRun)

  const itemsQuery = useQuery({
    queryKey: ['sensus-sync', 'items', selectedRun],
    queryFn: () => listSensusItems(selectedRun),
    enabled: can.syncSensus && Boolean(selectedRun),
  })

  const groups = useMemo(
    () =>
      [
        ...new Set((itemsQuery.data ?? []).map((item) => item.source_kelompok)),
      ].sort(),
    [itemsQuery.data]
  )
  const candidates = useMemo(
    () =>
      (itemsQuery.data ?? []).filter(
        (item) =>
          (kelompok === 'all' || item.source_kelompok === kelompok) &&
          (confidence === 'all' || item.confidence === confidence) &&
          (status === 'all' || item.status === status) &&
          (khusus === 'all' ||
            (khusus === 'khusus' ? item.source_khusus : !item.source_khusus)) &&
          item.source_name.toLowerCase().includes(name.toLowerCase())
      ),
    [confidence, itemsQuery.data, kelompok, khusus, name, status]
  )
  const pendingIds = useMemo(
    () => new Set(candidates.filter(isPending).map((item) => item.id)),
    [candidates]
  )
  const appliableIds = useMemo(
    () => new Set(candidates.filter(isAppliable).map((item) => item.id)),
    [candidates]
  )
  const pendingCount = pendingIds.size
  const selectedPendingCount = [...pendingIds].filter((id) =>
    selected.has(id)
  ).length
  const selectedAppliableCount = [...appliableIds].filter((id) =>
    selected.has(id)
  ).length

  if (!can.syncSensus)
    return (
      <div className='rounded-md border p-6 text-sm text-muted-foreground'>
        Access denied
      </div>
    )

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(pendingIds) : new Set())
  const handleGroupChange = (value: string) => {
    setGroup(value)
    setSelected(new Set())
  }
  const handleConfidenceChange = (value: string) => {
    setConfidence(value)
    setSelected(new Set())
  }
  const handleStatusChange = (value: string) => {
    setStatus(value)
    setSelected(new Set())
  }
  const handleKhususChange = (value: string) => {
    setKhusus(value)
    setSelected(new Set())
  }
  const handleNameChange = (value: string) => {
    setName(value)
    setSelected(new Set())
  }
  const toggleRowExpansion = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggle = (item: SensusSyncItem) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })

  const apply = async (): Promise<boolean> => {
    const itemsById = new Map(
      (itemsQuery.data ?? []).map((item) => [item.id, item])
    )
    const ids = [...selected].filter((id) => appliableIds.has(id))
    if (ids.length === 0) return false
    const autoPromoteCount = ids.filter((id) => {
      const item = itemsById.get(id)
      return item ? isSyncAutoPromoted(item) : false
    }).length
    try {
      const result = await applySensusSyncItems(ids)
      toast.success(`${result.applied} applied, ${result.failed} failed`)
      if (autoPromoteCount > 0 && result.applied > 0) {
        toast.info(
          `${autoPromoteCount} participants were automatically moved to GPN B because they are 23 or older`
        )
      }
      setSelected(new Set())
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sensus-sync'] }),
        queryClient.invalidateQueries({ queryKey: ['participants'] }),
      ])
      return true
    } catch (_error) {
      toast.error('Could not apply sensus sync')
      return false
    }
  }

  const reject = async (): Promise<boolean> => {
    const ids = [...selected].filter((id) => pendingIds.has(id))
    if (ids.length === 0) return false
    const { error } = await supabase
      .from('sensus_sync_items')
      .update({ status: 'rejected' })
      .in('id', ids)
      .eq('status', 'pending')
    if (error) {
      toast.error('Could not reject items')
      return false
    }
    toast.success(`${ids.length} items rejected`)
    setSelected(new Set())
    void queryClient.invalidateQueries({ queryKey: ['sensus-sync'] })
    return true
  }

  const confirmRun = async () => {
    if (!confirmAction) return
    setActionBusy(true)
    const ok = confirmAction === 'apply' ? await apply() : await reject()
    setActionBusy(false)
    if (ok) setConfirmAction(null)
  }

  const handleDeleteRun = async () => {
    if (!selectedRun) return
    setDeletingRun(true)
    try {
      await deleteSensusRun(selectedRun)
      toast.success('Sync run deleted')
      setDeleteOpen(false)
      setPickedRun('')
      setSelected(new Set())
      setExpanded(new Set())
      void queryClient.invalidateQueries({ queryKey: ['sensus-sync', 'runs'] })
    } catch {
      toast.error('Could not delete sync run')
    } finally {
      setDeletingRun(false)
    }
  }

  const rowNeedsCandidate = (item: SensusSyncItem) =>
    item.status === 'pending' &&
    item.matched_participant_id === null &&
    (item.patch.candidates?.length ?? 0) > 0

  const pickSimilar = async (
    item: SensusSyncItem,
    candidate: SensusSyncCandidate
  ) => {
    setSavingMatch(item.id)
    const { error } = await supabase
      .from('sensus_sync_items')
      .update({
        matched_participant_id: candidate.id,
        patch: {
          ...item.patch,
          current: {
            id: candidate.id,
            name: candidate.name,
            birth_date: candidate.birth_date,
            kategori: candidate.category,
            khusus: candidate.is_khusus,
          },
        },
      })
      .eq('id', item.id)
      .eq('status', 'pending')
    setSavingMatch(null)
    if (error) {
      toast.error('Could not select participant')
      return
    }
    void queryClient.invalidateQueries({ queryKey: ['sensus-sync'] })
  }

  const headerCheckboxState =
    pendingCount > 0 && selectedPendingCount === pendingCount
      ? true
      : selectedPendingCount > 0
        ? 'indeterminate'
        : false
  const activeRun = (runsQuery.data ?? []).find((run) => run.id === selectedRun)

  return (
    <div className='space-y-4'>
      {/* Query band: pick a run, then narrow the rows. One row from xl up,
          3-col / 2-col grids below — never a fixed-width single row, the
          minimums overflow the admin content area. */}
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(13rem,1.4fr)_minmax(8.5rem,0.8fr)_minmax(9rem,0.8fr)_minmax(8.5rem,0.8fr)_minmax(8rem,0.7fr)_minmax(11rem,1.1fr)] xl:items-center'>
        <div className='flex items-center gap-2'>
          <Select
            value={selectedRun}
            onValueChange={(id) => {
              setPickedRun(id)
              setSelected(new Set())
              setExpanded(new Set())
            }}
          >
            <SelectTrigger className='w-full min-w-0'>
              <SelectValue placeholder='Select a sync run'>
                {selectedRunLabel
                  ? `${new Date(selectedRunLabel.created_at).toLocaleString('id-ID')} · ${selectedRunLabel.status === 'failed' ? 'Failed' : `${selectedRunLabel.row_count} rows`}`
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(runsQuery.data ?? []).map((run) => (
                <SelectItem key={run.id} value={run.id}>
                  {new Date(run.created_at).toLocaleString('id-ID')} ·{' '}
                  {run.status === 'failed' ? 'Failed' : `${run.row_count} rows`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant='outline'
            size='icon'
            className='size-11 shrink-0 lg:size-9'
            aria-label='Delete this sync run'
            disabled={!selectedRun}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className='size-4' aria-hidden='true' />
          </Button>
        </div>
        <Select value={kelompok} onValueChange={handleGroupChange}>
          <SelectTrigger className='w-full min-w-0'>
            <SelectValue placeholder='All groups'>
              {kelompok === 'all' ? 'All groups' : kelompok}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All groups</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={confidence} onValueChange={handleConfidenceChange}>
          <SelectTrigger className='w-full min-w-0'>
            <SelectValue placeholder='All confidence'>
              {confidence === 'all'
                ? 'All confidence'
                : confidenceLabels[confidence as keyof typeof confidenceLabels]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All confidence levels</SelectItem>
            <SelectItem value='exact'>Exact</SelectItem>
            <SelectItem value='similar'>Similar</SelectItem>
            <SelectItem value='none'>New</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className='w-full min-w-0'>
            <SelectValue placeholder='All statuses'>
              {status === 'all'
                ? 'All statuses'
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All statuses</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='applied'>Applied</SelectItem>
            <SelectItem value='rejected'>Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={khusus} onValueChange={handleKhususChange}>
          <SelectTrigger className='w-full min-w-0'>
            <SelectValue placeholder='All rows'>
              {khusus === 'all'
                ? 'All rows'
                : khusus === 'khusus'
                  ? 'Khusus'
                  : 'Non-Khusus'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All rows</SelectItem>
            <SelectItem value='khusus'>Khusus</SelectItem>
            <SelectItem value='regular'>Non-Khusus</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className='h-11 w-full text-base sm:col-span-2 lg:col-span-1 lg:h-9 lg:text-sm'
          placeholder='Search source name'
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </div>
      {activeRun?.status === 'failed' && (
        <div className='rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
          Synchronization failed: {activeRun.error ?? 'Unknown error'}. Run sync
          again to retry.
        </div>
      )}
      <div className='overflow-x-auto rounded-md border'>
        <Table className='min-w-[850px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='w-10'>
                <Checkbox
                  aria-label='Select all pending rows'
                  checked={headerCheckboxState}
                  onCheckedChange={(value) => toggleAll(value === true)}
                />
              </TableHead>
              <TableHead>Source name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>JK</TableHead>
              <TableHead>Source birth date</TableHead>
              <TableHead>Source category → label</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Khusus</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className='h-24 text-center text-muted-foreground'
                >
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((item) => (
                <Fragment key={item.id}>
                  <TableRow>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${item.source_name}`}
                        checked={selected.has(item.id)}
                        disabled={!isPending(item)}
                        onCheckedChange={() => toggle(item)}
                      />
                    </TableCell>
                    <TableCell className='font-medium'>
                      <Button
                        type='button'
                        variant='link'
                        size='sm'
                        className='h-auto p-0 text-left font-medium'
                        aria-expanded={expanded.has(item.id)}
                        onClick={() => toggleRowExpansion(item.id)}
                      >
                        {item.source_name}
                      </Button>
                    </TableCell>
                    <TableCell>{item.source_kelompok}</TableCell>
                    <TableCell>{item.source_gender}</TableCell>
                    <TableCell>{item.source_birth_date ?? '—'}</TableCell>
                    <TableCell>
                      {formatKategoriLabel(item.source_kategori)} →{' '}
                      {formatKategoriLabel(item.patch.kategori)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={confidenceClass(item.confidence)}
                      >
                        {confidenceLabels[item.confidence]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.source_khusus ? (
                        <Badge variant='secondary'>Khusus</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {item.status === 'pending' && rowNeedsCandidate(item) ? (
                        <Badge
                          variant='outline'
                          className='border-amber-200 bg-amber-50 text-amber-700'
                        >
                          Needs review
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            item.status === 'pending'
                              ? 'outline'
                              : item.status === 'applied'
                                ? 'default'
                                : 'destructive'
                          }
                        >
                          {item.status === 'pending'
                            ? 'Pending'
                            : item.status === 'applied'
                              ? 'Applied'
                              : 'Rejected'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded.has(item.id) && (
                    <TableRow>
                      <TableCell colSpan={9} className='bg-muted/30'>
                        <div className='flex animate-in flex-col gap-4 px-1 py-1 text-sm duration-200 fade-in slide-in-from-top-1'>
                          {item.matched_participant_id === null ? (
                            rowNeedsCandidate(item) ? (
                              <p className='text-muted-foreground'>
                                Select a matching participant before applying.
                              </p>
                            ) : (
                              <p className='text-muted-foreground'>
                                No existing match — a new participant is created
                                when applied.
                              </p>
                            )
                          ) : (
                            <div className='grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-4'>
                              <ExpandField
                                label='Maps to'
                                to={item.patch.current?.name ?? '—'}
                              />
                              <ExpandField
                                label='Birth date'
                                from={item.patch.current?.birth_date ?? '—'}
                                to={item.patch.birth_date ?? '—'}
                              />
                              <ExpandField
                                label='Category'
                                from={formatKategoriLabel(
                                  item.patch.current?.kategori ??
                                    item.patch.kategori
                                )}
                                to={formatKategoriLabel(item.patch.kategori)}
                              />
                              <ExpandField
                                label='Khusus'
                                from={
                                  item.patch.current
                                    ? item.patch.current.khusus
                                      ? 'Yes'
                                      : 'No'
                                    : 'No'
                                }
                                to={item.patch.khusus ? 'Yes' : 'No'}
                              />
                            </div>
                          )}
                          {(item.patch.candidates?.length ?? 0) > 0 &&
                          item.status === 'pending' ? (
                            <div className='flex flex-wrap items-center gap-2'>
                              <Label htmlFor={`sensus-sync-match-${item.id}`}>
                                Select participant
                              </Label>
                              <Select
                                value={item.matched_participant_id ?? ''}
                                disabled={savingMatch === item.id}
                                onValueChange={(id) => {
                                  const candidate = item.patch.candidates?.find(
                                    (entry) => entry.id === id
                                  )
                                  if (candidate)
                                    void pickSimilar(item, candidate)
                                }}
                              >
                                <SelectTrigger
                                  id={`sensus-sync-match-${item.id}`}
                                  className='w-full sm:w-72'
                                >
                                  <SelectValue placeholder='Select matching participant' />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.patch.candidates?.map((candidate) => (
                                    <SelectItem
                                      key={candidate.id}
                                      value={candidate.id}
                                    >
                                      {candidate.name} · {candidate.kelompok} ·{' '}
                                      {candidate.gender} ·{' '}
                                      {formatKategoriLabel(
                                        candidate.category ?? ''
                                      )}
                                      {candidate.birth_date
                                        ? ` · ${candidate.birth_date}`
                                        : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {selected.size > 0 && (
        // Concentric radii: rounded-xl container (14px) = p-1.5 (6px) +
        // rounded-md buttons (8px).
        <div
          className='fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit animate-in items-center gap-1.5 rounded-xl border border-border/70 bg-popover py-1.5 pr-1.5 pl-2 shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.07)] duration-200 fade-in slide-in-from-bottom-2'
          role='toolbar'
          aria-label='Selection actions'
        >
          <Button
            variant='ghost'
            size='icon'
            className='size-11 shrink-0 transition-transform active:scale-[0.96] lg:size-9'
            aria-label='Clear selection'
            onClick={() => setSelected(new Set())}
          >
            <X className='size-4' aria-hidden='true' />
          </Button>
          <span
            role='status'
            className='px-1 text-sm whitespace-nowrap text-foreground'
          >
            <span className='font-semibold tabular-nums'>{selected.size}</span>{' '}
            {selected.size === 1 ? 'row' : 'rows'} selected
          </span>
          <div className='mx-1 h-5 w-px bg-border' aria-hidden='true' />
          <Button
            variant='destructive'
            className='min-h-11 transition-transform active:scale-[0.96] lg:min-h-9'
            onClick={() => setConfirmAction('reject')}
            disabled={selectedPendingCount === 0}
          >
            Reject&nbsp;
            <span className='tabular-nums opacity-80'>
              {selectedPendingCount}
            </span>
          </Button>
          <Button
            className='min-h-11 transition-transform active:scale-[0.96] lg:min-h-9'
            onClick={() => setConfirmAction('apply')}
            disabled={selectedAppliableCount === 0}
          >
            Apply&nbsp;
            <span className='tabular-nums opacity-80'>
              {selectedAppliableCount}
            </span>
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        title={
          confirmAction === 'apply'
            ? `Apply ${selectedAppliableCount} ${selectedAppliableCount === 1 ? 'row' : 'rows'} to participants?`
            : `Reject ${selectedPendingCount} ${selectedPendingCount === 1 ? 'row' : 'rows'}?`
        }
        desc={
          confirmAction === 'apply'
            ? 'Unmatched rows become new participants. Matched participants get their birth date, category, and khusus flag updated from the desabig source. Identical pending rows in other sync runs are marked applied too.'
            : 'Rejected rows stay in this run for reference and will not be applied.'
        }
        confirmText={confirmAction === 'apply' ? 'Apply' : 'Reject'}
        destructive={confirmAction === 'reject'}
        isLoading={actionBusy}
        handleConfirm={() => void confirmRun()}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={
          selectedRunLabel
            ? `Delete sync run from ${new Date(selectedRunLabel.created_at).toLocaleString('id-ID')}?`
            : 'Delete sync run?'
        }
        desc='This permanently removes the run together with all of its staged rows.'
        confirmText='Delete'
        destructive
        isLoading={deletingRun}
        handleConfirm={() => void handleDeleteRun()}
      />
    </div>
  )
}
