import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquareText, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useCharacterTargetItemsForMonth,
  useCharacterTargetReports,
  useUpsertCharacterTargetReport,
} from '../../hooks/use-lupg-queries'
import {
  type CharacterTargetItemRow,
  type CharacterTargetReportRow,
  type MonthlyReportRow,
} from '../../types'
import {
  CHARACTER_LEVEL_LABELS,
  CHARACTER_LEVELS,
} from '../../utils/character-monitoring'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function CharacterTargetSection({ report, readOnly }: Props) {
  const year = Number(report.month.slice(0, 4))
  const monthIndex = Number(report.month.slice(5, 7))
  const {
    data,
    isLoading: itemsLoading,
    error: itemsError,
  } = useCharacterTargetItemsForMonth(year, monthIndex)
  const {
    data: reports = [],
    isLoading: reportsLoading,
    error: reportsError,
  } = useCharacterTargetReports(report.id)

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const template = data?.template ?? null
  const templates = data?.templates ?? (template ? [template] : [])
  const reportByItem = useMemo(() => {
    const map = new Map<string, CharacterTargetReportRow>()
    for (const row of reports) map.set(row.target_item_id, row)
    return map
  }, [reports])

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, CharacterTargetItemRow[]>>()
    for (const item of items) {
      const levelMap = map.get(item.level_code) ?? new Map()
      const rows = levelMap.get(item.category_label) ?? []
      rows.push(item)
      levelMap.set(item.category_label, rows)
      map.set(item.level_code, levelMap)
    }
    return map
  }, [items])

  const activeItemIds = useMemo(() => new Set(items.map((item) => item.id)), [items])
  const filledCount = reports.filter(
    (row) =>
      activeItemIds.has(row.target_item_id) &&
      row.realization_percent !== null &&
      row.realization_percent !== undefined
  ).length
  const isLoading = itemsLoading || reportsLoading
  const error = itemsError ?? reportsError

  return (
    <section
      id='section-character-targets'
      className='bg-card text-card-foreground scroll-mt-24 flex flex-col gap-4 rounded-xl border p-5 shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Materi Target 29 Karakter'
        description={
          templates.length > 0
            ? `${templates.length} template aktif untuk bulan laporan. Isi realisasi, kekurangan materi, dan ayat/hal bila diperlukan.`
            : 'Belum ada template aktif untuk tahun laporan ini.'
        }
        status={
          items.length === 0
            ? 'empty'
            : filledCount === 0
              ? 'empty'
              : filledCount < items.length
                ? 'partial'
                : 'complete'
        }
      />

      {isLoading ? (
        <div className='text-muted-foreground flex items-center justify-center rounded-md border border-dashed py-8'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
          Memuat materi...
        </div>
      ) : error ? (
        <div className='rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive'>
          {error instanceof Error
            ? error.message
            : 'Gagal memuat target capaian materi.'}
        </div>
      ) : items.length === 0 ? (
        <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
          Belum ada materi aktif untuk bulan ini. Aktifkan template di
          Konfigurasi LUPG.
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {CHARACTER_LEVELS.map((level) => {
            const categoryMap = grouped.get(level)
            if (!categoryMap) return null

            return (
              <div key={level} className='overflow-hidden border-t first:border-t-0'>
                <div className='bg-muted/30 px-3 py-2'>
                  <h4 className='text-sm font-semibold tracking-tight'>
                    {CHARACTER_LEVEL_LABELS[level]}
                  </h4>
                </div>
                <div className='divide-y'>
                  {[...categoryMap.entries()].map(([category, rows]) => (
                    <div key={`${level}_${category}`} className='divide-y'>
                      <div className='bg-muted/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
                        {category}
                      </div>
                      {rows.map((item) => (
                        <CharacterTargetRow
                          key={item.id}
                          report={report}
                          item={item}
                          existing={reportByItem.get(item.id)}
                          readOnly={readOnly}
                        />
                      ))}
                    </div>
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

function CharacterTargetRow({
  report,
  item,
  existing,
  readOnly,
}: {
  report: MonthlyReportRow
  item: CharacterTargetItemRow
  existing: CharacterTargetReportRow | undefined
  readOnly: boolean
}) {
  const upsert = useUpsertCharacterTargetReport()
  const [realization, setRealization] = useState(
    existing?.realization_percent?.toString() ?? ''
  )
  const [materialGap, setMaterialGap] = useState(existing?.material_gap ?? '')
  const [referenceFrom, setReferenceFrom] = useState(
    existing?.reference_from_actual ?? ''
  )
  const [referenceTo, setReferenceTo] = useState(
    existing?.reference_to_actual ?? ''
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [notesVisible, setNotesVisible] = useState(Boolean(existing?.notes))
  const [materialGapVisible, setMaterialGapVisible] = useState(
    Boolean(existing?.material_gap)
  )

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  )
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRealization(existing?.realization_percent?.toString() ?? '')
    setMaterialGap(existing?.material_gap ?? '')
    setReferenceFrom(existing?.reference_from_actual ?? '')
    setReferenceTo(existing?.reference_to_actual ?? '')
    setNotes(existing?.notes ?? '')
    setNotesVisible(Boolean(existing?.notes))
    setMaterialGapVisible(Boolean(existing?.material_gap))
  }, [
    existing?.id,
    existing?.updated_at,
    existing?.realization_percent,
    existing?.material_gap,
    existing?.reference_from_actual,
    existing?.reference_to_actual,
    existing?.notes,
  ])

  const save = (next?: {
    realization?: string
    materialGap?: string
    referenceFrom?: string
    referenceTo?: string
    notes?: string
  }) => {
    const rawRealization = next?.realization ?? realization
    const parsedRealization =
      rawRealization.trim() === ''
        ? null
        : Math.max(0, Math.min(100, Number(rawRealization)))

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')

    upsert.mutate(
      {
        monthly_report_id: report.id,
        target_item_id: item.id,
        realization_percent: Number.isFinite(parsedRealization)
          ? parsedRealization
          : null,
        material_gap: (next?.materialGap ?? materialGap).trim() || null,
        reference_from_actual:
          (next?.referenceFrom ?? referenceFrom).trim() || null,
        reference_to_actual: (next?.referenceTo ?? referenceTo).trim() || null,
        notes: (next?.notes ?? notes).trim() || null,
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
  const needsReference = item.uses_reference

  return (
    <div className='grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start'>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'>
            {realization ? `${realization}%` : 'Belum diisi'}
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
        <p className='mt-1 text-sm font-semibold leading-6 whitespace-normal wrap-break-word'>
          {item.material_label}
        </p>
        {item.detail_label ? (
          <p className='text-muted-foreground mt-1 text-sm leading-6 whitespace-normal wrap-break-word'>
            {item.detail_label}
          </p>
        ) : null}
        {item.reference_from || item.reference_to ? (
          <p className='text-muted-foreground mt-1 text-xs'>
            Target:{' '}
            {[item.reference_from, item.reference_to].filter(Boolean).join(' - ')}
          </p>
        ) : null}
      </div>

      <div className='flex min-w-0 flex-col gap-2'>
        <div className={cn('grid gap-2', needsReference ? 'grid-cols-3' : 'grid-cols-1')}>
          <Input
            type='number'
            min={0}
            max={100}
            value={realization}
            onChange={(e) => setRealization(e.target.value)}
            onBlur={() => save({ realization })}
            disabled={readOnly || upsert.isPending}
            placeholder='Realisasi (%)'
            className='h-9 text-xs'
          />
          {needsReference && (
            <>
              <Input
                value={referenceFrom}
                onChange={(e) => setReferenceFrom(e.target.value)}
                onBlur={() => save({ referenceFrom })}
                disabled={readOnly || upsert.isPending}
                placeholder='Dari ayat/hal'
                className='h-9 text-xs'
              />
              <Input
                value={referenceTo}
                onChange={(e) => setReferenceTo(e.target.value)}
                onBlur={() => save({ referenceTo })}
                disabled={readOnly || upsert.isPending}
                placeholder='Sampai ayat/hal'
                className='h-9 text-xs'
              />
            </>
          )}
        </div>

        {materialGapVisible && (
          <div className='flex min-w-0 items-center gap-2'>
            <Input
              value={materialGap}
              onChange={(e) => setMaterialGap(e.target.value)}
              onBlur={() => {
                save({ materialGap })
                if (!materialGap.trim()) setMaterialGapVisible(false)
              }}
              disabled={readOnly || upsert.isPending}
              placeholder='Kurang materi'
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
                  setMaterialGap('')
                  save({ materialGap: '' })
                  setMaterialGapVisible(false)
                }}
                aria-label='Hapus kurang materi'
              >
                <X className='h-4 w-4' />
              </Button>
            ) : null}
          </div>
        )}

        {notesVisible ? (
          <div className='flex min-w-0 items-center gap-2'>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                save({ notes })
                if (!notes.trim()) setNotesVisible(false)
              }}
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
        ) : null}

        {!readOnly && (!materialGapVisible || !notesVisible) && (
          <div className='flex items-center gap-2 justify-end mt-1'>
            {!materialGapVisible && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground'
                disabled={upsert.isPending}
                onClick={() => setMaterialGapVisible(true)}
              >
                + Kurang Materi
              </Button>
            )}
            {!notesVisible && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground'
                disabled={upsert.isPending}
                onClick={() => setNotesVisible(true)}
              >
                <MessageSquareText className='mr-1 h-3 w-3' />
                + Catatan
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
