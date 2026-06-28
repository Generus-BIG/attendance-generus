import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquareText, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useActiveCharacterMonitoringActivities,
  useCharacterMonitoringReports,
  useUpsertCharacterMonitoringReport,
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
      activeActivityIds.has(row.activity_id) && row.status !== 'not_observed'
  ).length
  const isLoading = activitiesLoading || reportsLoading

  return (
    <section
      id='section-character-monitoring'
      className='bg-card text-card-foreground scroll-mt-24 flex flex-col gap-4 rounded-xl border p-5 shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Monitoring Penerapan 29 Karakter'
        description='Pantau penerapan kegiatan karakter per jenjang untuk laporan bulan ini.'
        status={
          activities.length === 0
            ? 'empty'
            : filledCount === 0
              ? 'empty'
              : filledCount < activities.length
                ? 'partial'
                : 'complete'
        }
      />

      {isLoading ? (
        <div className='text-muted-foreground flex items-center justify-center rounded-md border border-dashed py-8'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
          Memuat...
        </div>
      ) : activities.length === 0 ? (
        <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
          Belum ada kegiatan Target 29 Karakter aktif.
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {CHARACTER_LEVELS.map((level) => {
            const levelActivities = activitiesByLevel.get(level) ?? []
            if (levelActivities.length === 0) return null
            return (
              <div key={level} className='overflow-hidden border-t first:border-t-0'>
                <div className='bg-muted/30 px-3 py-2'>
                  <h4 className='text-sm font-semibold tracking-tight'>
                    {CHARACTER_LEVEL_LABELS[level]}
                  </h4>
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
  const [status, setStatus] = useState<CharacterMonitoringStatus>(
    normalizeCharacterStatus(existing?.status)
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [notesVisible, setNotesVisible] = useState(Boolean(existing?.notes))

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
    // Keep local row controls aligned after query invalidation returns a newer row.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(normalizeCharacterStatus(existing?.status))
    setNotes(existing?.notes ?? '')
    setNotesVisible(Boolean(existing?.notes))
  }, [existing?.id, existing?.updated_at, existing?.status, existing?.notes])

  const save = (next?: {
    status?: CharacterMonitoringStatus
    notes?: string
  }) => {
    const nextStatus = next?.status ?? status
    const nextNotes = next?.notes ?? notes

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')

    upsert.mutate(
      {
        monthly_report_id: report.id,
        activity_id: activity.id,
        status: nextStatus,
        notes: nextNotes.trim() ? nextNotes : null,
      },
      {
        onSuccess: () => {
          setSaveStatus('saved')
          saveTimeoutRef.current = setTimeout(() => {
            setSaveStatus('idle')
          }, 1500)
        },
        onError: (e: unknown) => {
          setSaveStatus('idle')
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const handleStatusChange = (newStatus: CharacterMonitoringStatus) => {
    setStatus(newStatus)
    save({ status: newStatus })
  }

  const handleNotesBlur = () => {
    save({ notes })
    if (!notes.trim()) setNotesVisible(false)
  }

  return (
    <div className='grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start'>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground'>
            {activity.activity_code}
          </span>
          {saveStatus === 'saving' && (
            <span className='flex items-center gap-1 text-[10px] text-muted-foreground animate-pulse'>
              <Loader2 className='h-3 w-3 animate-spin text-primary' />
              Menyimpan...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className='flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium'>
              <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-0.5 animate-pulse' />
              Disimpan
            </span>
          )}
        </div>
        <p className='mt-1 text-sm font-medium leading-6 whitespace-normal wrap-break-word'>
          {activity.activity_label}
        </p>
      </div>

      <div className='flex min-w-0 flex-col gap-2'>
        <div className='flex flex-wrap gap-1'>
          {CHARACTER_STATUS_CODES.map((code) => {
            const isActive = status === code
            const meta = CHARACTER_STATUS_META[code]
            const shortLabelMap: Record<string, string> = {
              needs_discussion: 'Musyawarah',
              needs_guidance: 'Pembinaan',
              not_observed: 'Belum',
              in_progress: 'Mulai',
              established: 'Terbiasa',
            }
            const shortLabel = shortLabelMap[code] ?? meta.label

            return (
              <button
                key={code}
                type='button'
                disabled={readOnly || upsert.isPending}
                onClick={() => handleStatusChange(code)}
                title={meta.label}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold border transition-all duration-150 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                  isActive
                    ? meta.className
                    : 'border-border/60 bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                )}
              >
                {shortLabel}
              </button>
            )
          })}
        </div>
        {notesVisible ? (
          <div className='flex min-w-0 items-center gap-2'>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              disabled={readOnly || upsert.isPending}
              placeholder='Catatan singkat'
              className='h-9 min-w-0 flex-1 text-xs'
            />
            {!readOnly ? (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
                disabled={upsert.isPending}
                onClick={() => {
                  setNotes('')
                  save({ notes: '' })
                  setNotesVisible(false)
                }}
                aria-label='Hapus catatan'
              >
                <X className='h-4 w-4' />
              </Button>
            ) : null}
          </div>
        ) : !readOnly ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 self-end px-2.5 text-xs text-muted-foreground'
            disabled={upsert.isPending}
            onClick={() => setNotesVisible(true)}
          >
            <MessageSquareText className='mr-1.5 h-3.5 w-3.5' />
            Add note
          </Button>
        ) : null}
      </div>
    </div>
  )
}
