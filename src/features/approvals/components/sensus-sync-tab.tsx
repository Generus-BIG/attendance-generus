'use client'

import { Fragment, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { isSyncAutoPromoted } from '@/features/sensus-sync/auto-promote'
import {
  applySensusSyncItems,
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

export function SensusSyncTab({ runId }: { runId?: string }) {
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const [pickedRun, setPickedRun] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [kelompok, setGroup] = useState('all')
  const [confidence, setConfidence] = useState('all')
  const [name, setName] = useState('')
  const [savingMatch, setSavingMatch] = useState<string | null>(null)

  const runsQuery = useQuery({
    queryKey: ['sensus-sync', 'runs'],
    queryFn: listSensusRuns,
    enabled: can.syncSensus,
  })
  const selectedRun = pickedRun || runId || runsQuery.data?.[0]?.id || ''
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
          item.source_name.toLowerCase().includes(name.toLowerCase())
      ),
    [confidence, itemsQuery.data, kelompok, name]
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

  const apply = async () => {
    const itemsById = new Map(
      (itemsQuery.data ?? []).map((item) => [item.id, item])
    )
    const ids = [...selected].filter((id) => appliableIds.has(id))
    if (ids.length === 0) return
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
    } catch (_error) {
      toast.error('Could not apply sensus sync')
    }
  }

  const reject = async () => {
    const ids = [...selected].filter((id) => pendingIds.has(id))
    if (ids.length === 0) return
    const { error } = await supabase
      .from('sensus_sync_items')
      .update({ status: 'rejected' })
      .in('id', ids)
      .eq('status', 'pending')
    if (error) {
      toast.error('Could not reject items')
      return
    }
    toast.success(`${ids.length} items rejected`)
    setSelected(new Set())
    void queryClient.invalidateQueries({ queryKey: ['sensus-sync'] })
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
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.4fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(13rem,1fr)_auto] lg:items-center'>
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
            <SelectValue placeholder='All confidence levels'>
              {confidence === 'all'
                ? 'All confidence levels'
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
        <Input
          className='h-11 w-full text-base sm:col-span-2 lg:col-span-1 lg:h-9 lg:text-sm'
          placeholder='Search source name'
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
        />
        <div className='grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1 lg:flex lg:justify-end'>
          {selected.size > 0 && (
            <span
              role='status'
              className='col-span-2 flex items-center justify-center text-sm text-muted-foreground tabular-nums lg:col-span-1 lg:justify-end'
            >
              {selectedAppliableCount === selected.size
                ? `${selected.size} selected`
                : `${selected.size} selected · ${selectedAppliableCount} appliable`}
            </span>
          )}
          <Button
            variant='outline'
            className='min-h-11 lg:min-h-9'
            onClick={() => void reject()}
            disabled={selectedPendingCount === 0}
          >
            Reject selected
          </Button>
          <Button
            className='min-h-11 lg:min-h-9'
            onClick={() => void apply()}
            disabled={selectedAppliableCount === 0}
          >
            Apply selected
          </Button>
        </div>
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
                      <Badge
                        variant={
                          item.status === 'pending'
                            ? 'outline'
                            : item.status === 'applied'
                              ? 'default'
                              : 'destructive'
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {expanded.has(item.id) && (
                    <TableRow>
                      <TableCell colSpan={9} className='bg-muted/30'>
                        <div className='space-y-2 text-sm'>
                          {item.matched_participant_id === null ? (
                            rowNeedsCandidate(item) ? (
                              <div className='text-muted-foreground'>
                                Select a matching participant before applying.
                              </div>
                            ) : (
                              <div className='text-muted-foreground'>
                                Participant baru akan dibuat saat diterapkan.
                              </div>
                            )
                          ) : (
                            <div className='grid gap-1'>
                              <div>
                                <span className='font-medium'>
                                  Participant:
                                </span>{' '}
                                {item.patch.current?.name ?? '—'}
                              </div>
                              <div>
                                <span className='font-medium'>birth_date:</span>{' '}
                                {item.patch.current?.birth_date ?? '—'} →{' '}
                                {item.patch.birth_date ?? '—'}
                                {item.patch.current?.birth_date &&
                                item.patch.birth_date &&
                                item.patch.current.birth_date !==
                                  item.patch.birth_date ? (
                                  <span className='text-muted-foreground'>
                                    {' '}
                                    (replaced by desabig)
                                  </span>
                                ) : null}
                              </div>
                              <div>
                                <span className='font-medium'>category:</span>{' '}
                                {formatKategoriLabel(
                                  item.patch.current?.kategori ??
                                    item.patch.kategori
                                )}{' '}
                                → {formatKategoriLabel(item.patch.kategori)}
                                {item.patch.current?.kategori &&
                                item.patch.current.kategori !==
                                  item.patch.kategori ? (
                                  <span className='text-muted-foreground'>
                                    {' '}
                                    (replaced by desabig)
                                  </span>
                                ) : null}
                              </div>
                              <div>
                                <span className='font-medium'>special:</span>{' '}
                                {String(item.patch.current?.khusus ?? false)} →{' '}
                                {String(item.patch.khusus)}
                                {item.patch.current &&
                                item.patch.current.khusus !==
                                  item.patch.khusus ? (
                                  <span className='text-muted-foreground'>
                                    {' '}
                                    (replaced by desabig)
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          )}
                          {rowNeedsCandidate(item) ? (
                            <div className='flex items-center gap-2'>
                              <Label htmlFor={`sensus-sync-match-${item.id}`}>
                                Select participant:
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
                                  className='w-72'
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
    </div>
  )
}
