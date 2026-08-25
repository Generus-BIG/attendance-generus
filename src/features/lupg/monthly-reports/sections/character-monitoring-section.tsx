import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, MessageSquareText, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  useActiveCharacterMonitoringActivities,
  useCharacterMonitoringReports,
  useUpsertCharacterMonitoringReport,
  useUpsertCharacterMonitoringReports,
} from '../../hooks/use-lupg-queries'
import {
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringReportRow,
  type MonthlyReportRow,
} from '../../types'
import {
  CHARACTER_LEVEL_LABELS,
  CHARACTER_LEVELS,
  CHARACTER_STATUS_CODES,
  CHARACTER_STATUS_META,
  normalizeCharacterStatus,
  sortCharacterActivities,
  type CharacterMonitoringStatus,
} from '../../utils/character-monitoring'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

const BULK_STATUS_CODES = CHARACTER_STATUS_CODES.filter(
  (status) => status !== 'needs_guidance'
)

export function CharacterMonitoringSection({ report, readOnly }: Props) {
  const { data: activities = [], isLoading: activitiesLoading } =
    useActiveCharacterMonitoringActivities()
  const { data: reports = [], isLoading: reportsLoading } =
    useCharacterMonitoringReports(report.id)

  const reportByActivityId = useMemo(() => {
    const map = new Map<string, CharacterMonitoringReportRow>()
    for (const row of reports) map.set(row.activity_id, row)
    return map
  }, [reports])

  const activitiesByLevel = useMemo(() => {
    const map = new Map<string, CharacterMonitoringActivityRow[]>()
    for (const activity of sortCharacterActivities(activities)) {
      const rows = map.get(activity.level_code) ?? []
      rows.push(activity)
      map.set(activity.level_code, rows)
    }
    return map
  }, [activities])

  const activeActivityIds = useMemo(
    () => new Set(activities.map((activity) => activity.id)),
    [activities]
  )
  const filledCount = reports.filter(
    (row) =>
      activeActivityIds.has(row.activity_id) &&
      normalizeCharacterStatus(row.status) !== null
  ).length
  const isLoading = activitiesLoading || reportsLoading

  return (
    <section
      id='section-character-monitoring'
      className='flex scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Penerapan 29 Karakter'
        description={`${filledCount}/${activities.length} konteks telah dinilai. Penilaian kosong tetap dianggap Belum dinilai.`}
        status={
          activities.length === 0 || filledCount === 0
            ? 'empty'
            : filledCount < activities.length
              ? 'partial'
              : 'complete'
        }
      />

      {isLoading ? (
        <div className='flex items-center justify-center rounded-md border border-dashed py-8 text-muted-foreground'>
          <Loader2 className='mr-2 size-5 animate-spin' />
          Memuat...
        </div>
      ) : activities.length === 0 ? (
        <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
          Belum ada kegiatan Target 29 Karakter aktif.
        </div>
      ) : (
        <div className='flex flex-col gap-5'>
          {CHARACTER_LEVELS.map((level) => {
            const levelActivities = activitiesByLevel.get(level) ?? []
            if (levelActivities.length === 0) return null
            const completed = levelActivities.filter(
              (activity) =>
                normalizeCharacterStatus(
                  reportByActivityId.get(activity.id)?.status
                ) !== null
            ).length

            return (
              <div key={level} className='overflow-hidden rounded-lg border'>
                <div className='flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-3 py-2'>
                  <div className='flex items-baseline gap-2'>
                    <h4 className='text-sm font-semibold tracking-tight'>
                      {CHARACTER_LEVEL_LABELS[level]}
                    </h4>
                    <span className='text-xs text-muted-foreground tabular-nums'>
                      {completed}/{levelActivities.length}
                    </span>
                  </div>
                  {!readOnly ? (
                    <CharacterSetAll
                      reportId={report.id}
                      activities={levelActivities}
                      reportByActivityId={reportByActivityId}
                    />
                  ) : null}
                </div>
                <div className='divide-y'>
                  {levelActivities.map((activity) => (
                    <CharacterMonitoringRow
                      key={activity.id}
                      report={report}
                      activity={activity}
                      existing={reportByActivityId.get(activity.id)}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function CharacterSetAll({
  reportId,
  activities,
  reportByActivityId,
}: {
  reportId: string
  activities: CharacterMonitoringActivityRow[]
  reportByActivityId: Map<string, CharacterMonitoringReportRow>
}) {
  const bulkUpsert = useUpsertCharacterMonitoringReports()
  const [open, setOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<
    Exclude<CharacterMonitoringStatus, 'needs_guidance'> | ''
  >('')
  const emptyCount = activities.filter(
    (activity) =>
      normalizeCharacterStatus(reportByActivityId.get(activity.id)?.status) ===
      null
  ).length

  const apply = (overwrite: boolean) => {
    if (!selectedStatus) return
    const affected = activities.filter(
      (activity) =>
        overwrite ||
        normalizeCharacterStatus(
          reportByActivityId.get(activity.id)?.status
        ) === null
    )
    bulkUpsert.mutate(
      affected.map((activity) => ({
        monthly_report_id: reportId,
        activity_id: activity.id,
        status: selectedStatus,
      })),
      {
        onSuccess: () => {
          toast.success(`${affected.length} penilaian diperbarui`)
          setOpen(false)
          setSelectedStatus('')
        },
        onError: (error: unknown) => {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Gagal memperbarui penilaian'
          )
        },
      }
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSelectedStatus('')
      }}
    >
      <PopoverTrigger asChild>
        <Button type='button' variant='outline' size='sm'>
          Set all
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[min(22rem,calc(100vw-2rem))]'>
        <div className='flex flex-col gap-3'>
          <div>
            <p className='text-sm font-semibold'>Set assessment</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Choose a value first. Pembinaan is excluded because it requires a
              row-specific note.
            </p>
          </div>
          <ToggleGroup
            type='single'
            value={selectedStatus}
            onValueChange={(value) =>
              setSelectedStatus(
                value as Exclude<CharacterMonitoringStatus, 'needs_guidance'>
              )
            }
            variant='outline'
            spacing={1}
            className='grid w-full grid-cols-2'
          >
            {BULK_STATUS_CODES.map((status) => (
              <ToggleGroupItem
                key={status}
                value={status}
                aria-label={CHARACTER_STATUS_META[status].label}
                className={cn(
                  'min-h-10 w-full transition-[color,background-color,border-color,box-shadow]',
                  CHARACTER_STATUS_META[status].optionClassName
                )}
              >
                {CHARACTER_STATUS_META[status].shortLabel}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              type='button'
              className='flex-1'
              disabled={
                !selectedStatus || emptyCount === 0 || bulkUpsert.isPending
              }
              onClick={() => apply(false)}
            >
              {bulkUpsert.isPending ? (
                <Loader2 className='animate-spin' />
              ) : null}
              Set all ({emptyCount})
            </Button>
            <Button
              type='button'
              variant='outline'
              className='flex-1'
              disabled={!selectedStatus || bulkUpsert.isPending}
              onClick={() => apply(true)}
            >
              Overwrite all
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface RowProps {
  report: MonthlyReportRow
  activity: CharacterMonitoringActivityRow
  existing: CharacterMonitoringReportRow | undefined
  readOnly: boolean
}

function CharacterMonitoringRow({
  report,
  activity,
  existing,
  readOnly,
}: RowProps) {
  const upsert = useUpsertCharacterMonitoringReport()
  const [status, setStatus] = useState<CharacterMonitoringStatus | null>(
    () => normalizeCharacterStatus(existing?.status)
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [notesVisible, setNotesVisible] = useState(
    Boolean(existing?.notes) || existing?.status === 'needs_guidance'
  )
  const [showNoteError, setShowNoteError] = useState(
    existing?.status === 'needs_guidance' && !existing.notes?.trim()
  )
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  )
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    // Keep row controls aligned after query invalidation returns a newer row.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(normalizeCharacterStatus(existing?.status))
    setNotes(existing?.notes ?? '')
    setNotesVisible(
      Boolean(existing?.notes) || existing?.status === 'needs_guidance'
    )
    setShowNoteError(
      existing?.status === 'needs_guidance' && !existing.notes?.trim()
    )
  }, [existing?.id, existing?.updated_at, existing?.status, existing?.notes])

  const save = (next: {
    status: CharacterMonitoringStatus | null
    notes: string
  }) => {
    if (next.status === 'needs_guidance' && !next.notes.trim()) {
      setShowNoteError(true)
      return
    }
    setShowNoteError(false)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')
    upsert.mutate(
      {
        monthly_report_id: report.id,
        activity_id: activity.id,
        status: next.status,
        notes: next.notes.trim() || null,
      },
      {
        onSuccess: () => {
          setSaveStatus('saved')
          saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 1500)
        },
        onError: (error: unknown) => {
          setSaveStatus('idle')
          toast.error(
            error instanceof Error ? error.message : 'Gagal menyimpan'
          )
        },
      }
    )
  }

  const handleStatusChange = (value: string) => {
    const nextStatus = value ? (value as CharacterMonitoringStatus) : null
    setStatus(nextStatus)
    if (nextStatus === 'needs_guidance') {
      setNotesVisible(true)
      if (notes.trim()) save({ status: nextStatus, notes })
      else setShowNoteError(true)
      return
    }
    save({ status: nextStatus, notes })
  }

  return (
    <div className='grid gap-3 px-3 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,34rem)] lg:items-start'>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase'>
            {activity.activity_code}
          </span>
          {saveStatus === 'saving' ? (
            <span className='flex items-center gap-1 text-[10px] text-muted-foreground'>
              <Loader2 className='size-3 animate-spin' /> Menyimpan...
            </span>
          ) : null}
          {saveStatus === 'saved' ? (
            <span className='flex items-center gap-1 text-[10px] font-medium text-emerald-600'>
              <Check className='size-3' /> Disimpan
            </span>
          ) : null}
        </div>
        <p className='mt-1 text-sm leading-6 font-medium wrap-break-word whitespace-normal'>
          {activity.activity_label}
        </p>
        {!status ? (
          <p className='mt-1 text-xs text-muted-foreground'>Belum dinilai</p>
        ) : null}
      </div>

      <div className='flex min-w-0 flex-col gap-2'>
        <ToggleGroup
          type='single'
          value={status ?? ''}
          onValueChange={handleStatusChange}
          disabled={readOnly || upsert.isPending}
          variant='outline'
          spacing={1}
          className='grid w-full grid-cols-2 sm:grid-cols-5'
        >
          {CHARACTER_STATUS_CODES.map((code) => (
            <ToggleGroupItem
              key={code}
              value={code}
              aria-label={CHARACTER_STATUS_META[code].label}
              title={CHARACTER_STATUS_META[code].label}
              className={cn(
                'min-h-12 w-full px-2 py-2 text-center text-xs leading-tight whitespace-normal transition-[color,background-color,border-color,box-shadow]',
                CHARACTER_STATUS_META[code].optionClassName,
                code === 'established' && 'col-span-2 sm:col-span-1'
              )}
            >
              {CHARACTER_STATUS_META[code].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {notesVisible ? (
          <div className='flex min-w-0 flex-col gap-1'>
            <div className='flex min-w-0 items-center gap-2'>
              <Input
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value)
                  if (event.target.value.trim()) setShowNoteError(false)
                }}
                onBlur={() => save({ status, notes })}
                disabled={readOnly || upsert.isPending}
                required={status === 'needs_guidance'}
                aria-invalid={showNoteError}
                placeholder={
                  status === 'needs_guidance'
                    ? 'Catatan pembinaan (wajib)'
                    : 'Catatan singkat'
                }
                className='min-h-10 min-w-0 flex-1 text-xs'
              />
              {!readOnly && status !== 'needs_guidance' ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-10 shrink-0'
                  disabled={upsert.isPending}
                  onClick={() => {
                    setNotes('')
                    save({ status, notes: '' })
                    setNotesVisible(false)
                  }}
                  aria-label='Hapus catatan'
                >
                  <X />
                </Button>
              ) : null}
            </div>
            {showNoteError ? (
              <p className='text-xs text-destructive'>
                Perlu Pembinaan harus disertai catatan singkat.
              </p>
            ) : null}
          </div>
        ) : !readOnly ? (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='min-h-10 self-end'
            disabled={upsert.isPending}
            onClick={() => setNotesVisible(true)}
          >
            <MessageSquareText data-icon='inline-start' />
            Add note
          </Button>
        ) : null}
      </div>
    </div>
  )
}
