import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Check, Loader2, MessageSquareText, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useCharacterTargetItemsForMonth,
  useCharacterTargetReports,
  useUpsertCharacterTargetReport,
  useUpsertCharacterTargetReports,
} from '../../hooks/use-lupg-queries'
import {
  type CharacterTargetItemRow,
  type CharacterTargetReportRow,
  type MonthlyReportRow,
} from '../../types'
import {
  CHARACTER_LEVEL_LABELS,
  CHARACTER_LEVELS,
  type CharacterLevelCode,
} from '../../utils/character-monitoring'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

function isTargetComplete(report: CharacterTargetReportRow | undefined) {
  return (
    report?.realization_percent !== null &&
    report?.realization_percent !== undefined
  )
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
  const [activeLevel, setActiveLevel] = useState<CharacterLevelCode | ''>('')
  const [bulkPercent, setBulkPercent] = useState(90)

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const templates = data?.templates ?? (data?.template ? [data.template] : [])
  const reportByItem = useMemo(() => {
    const map = new Map<string, CharacterTargetReportRow>()
    for (const row of reports) map.set(row.target_item_id, row)
    return map
  }, [reports])

  const grouped = useMemo(() => {
    const map = new Map<
      CharacterLevelCode,
      Map<string, CharacterTargetItemRow[]>
    >()
    for (const item of items) {
      const level = item.level_code as CharacterLevelCode
      const levelMap =
        map.get(level) ?? new Map<string, CharacterTargetItemRow[]>()
      const rows = levelMap.get(item.category_label) ?? []
      rows.push(item)
      levelMap.set(item.category_label, rows)
      map.set(level, levelMap)
    }
    return map
  }, [items])

  const availableLevels = useMemo(
    () => CHARACTER_LEVELS.filter((level) => grouped.has(level)),
    [grouped]
  )
  const progressByLevel = useMemo(() => {
    const progress = new Map<
      CharacterLevelCode,
      { completed: number; total: number }
    >()
    for (const level of availableLevels) {
      const levelItems = [...(grouped.get(level)?.values() ?? [])].flat()
      progress.set(level, {
        completed: levelItems.filter((item) =>
          isTargetComplete(reportByItem.get(item.id))
        ).length,
        total: levelItems.length,
      })
    }
    return progress
  }, [availableLevels, grouped, reportByItem])

  useEffect(() => {
    if (itemsLoading || reportsLoading || availableLevels.length === 0) return
    if (activeLevel && availableLevels.includes(activeLevel)) return
    const firstIncomplete = availableLevels.find((level) => {
      const progress = progressByLevel.get(level)
      return progress && progress.completed < progress.total
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveLevel(firstIncomplete ?? availableLevels[0])
  }, [
    activeLevel,
    availableLevels,
    itemsLoading,
    progressByLevel,
    reportsLoading,
  ])

  const activeCategoryMap = activeLevel ? grouped.get(activeLevel) : undefined
  const filledCount = items.filter((item) =>
    isTargetComplete(reportByItem.get(item.id))
  ).length
  const isLoading = itemsLoading || reportsLoading
  const error = itemsError ?? reportsError

  return (
    <section
      id='section-character-targets'
      className='flex scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Target Capaian Materi'
        description={
          templates.length > 0
            ? `${filledCount}/${items.length} materi terisi. Target ayat/hal ditampilkan sebagai referensi dan catatan lain tetap opsional.`
            : 'Belum ada template aktif untuk tahun laporan ini.'
        }
        status={
          items.length === 0 || filledCount === 0
            ? 'empty'
            : filledCount < items.length
              ? 'partial'
              : 'complete'
        }
      />

      {isLoading ? (
        <div className='flex items-center justify-center rounded-md border border-dashed py-8 text-muted-foreground'>
          <Loader2 className='mr-2 size-5 animate-spin' />
          Memuat materi...
        </div>
      ) : error ? (
        <div className='rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive'>
          {error instanceof Error
            ? error.message
            : 'Gagal memuat target capaian materi.'}
        </div>
      ) : items.length === 0 ? (
        <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
          Belum ada materi aktif untuk bulan ini. Aktifkan template di
          Konfigurasi LUPG.
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          <Tabs
            value={activeLevel}
            onValueChange={(value) =>
              setActiveLevel(value as CharacterLevelCode)
            }
          >
            <TabsList className='h-auto w-full justify-start gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-4'>
              {availableLevels.map((level) => {
                const progress = progressByLevel.get(level)
                return (
                  <TabsTrigger
                    key={level}
                    value={level}
                    className='min-h-11 min-w-24 shrink-0 gap-2 px-3 sm:min-w-0'
                  >
                    <span>{CHARACTER_LEVEL_LABELS[level]}</span>
                    <span className='text-xs font-normal tabular-nums opacity-75'>
                      {progress?.completed ?? 0}/{progress?.total ?? 0}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>

          {activeLevel && activeCategoryMap ? (
            <div className='flex flex-wrap items-center justify-between gap-3 border-y bg-muted/20 px-3 py-2.5'>
              <div>
                <p className='text-sm font-semibold'>
                  {CHARACTER_LEVEL_LABELS[activeLevel]}
                </p>
                <p className='text-xs text-muted-foreground tabular-nums'>
                  {progressByLevel.get(activeLevel)?.completed ?? 0} dari{' '}
                  {progressByLevel.get(activeLevel)?.total ?? 0} materi terisi
                </p>
              </div>
              {!readOnly ? (
                <TargetFillAll
                  reportId={report.id}
                  levelLabel={CHARACTER_LEVEL_LABELS[activeLevel]}
                  items={[...activeCategoryMap.values()].flat()}
                  reportByItem={reportByItem}
                  percent={bulkPercent}
                  onPercentChange={setBulkPercent}
                />
              ) : null}
            </div>
          ) : null}

          <div className='flex flex-col gap-5'>
            {[...(activeCategoryMap?.entries() ?? [])].map(
              ([category, rows]) => {
                const completed = rows.filter((item) =>
                  isTargetComplete(reportByItem.get(item.id))
                ).length
                return (
                  <div key={`${activeLevel}:${category}`}>
                    <div className='flex items-baseline justify-between gap-3 border-b pb-2'>
                      <h4 className='text-sm font-semibold tracking-tight'>
                        {category}
                      </h4>
                      <span className='shrink-0 text-xs text-muted-foreground tabular-nums'>
                        {completed}/{rows.length} terisi
                      </span>
                    </div>
                    <div className='divide-y'>
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
                  </div>
                )
              }
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function TargetFillAll({
  reportId,
  levelLabel,
  items,
  reportByItem,
  percent,
  onPercentChange,
}: {
  reportId: string
  levelLabel: string
  items: CharacterTargetItemRow[]
  reportByItem: Map<string, CharacterTargetReportRow>
  percent: number
  onPercentChange: (value: number) => void
}) {
  const bulkUpsert = useUpsertCharacterTargetReports()
  const [open, setOpen] = useState(false)
  const emptyCount = items.filter(
    (item) => !isTargetComplete(reportByItem.get(item.id))
  ).length

  const apply = (overwrite: boolean) => {
    const normalizedPercent = Math.max(0, Math.min(100, percent))
    const affected = items.filter(
      (item) => overwrite || !isTargetComplete(reportByItem.get(item.id))
    )
    bulkUpsert.mutate(
      affected.map((item) => ({
        monthly_report_id: reportId,
        target_item_id: item.id,
        realization_percent: normalizedPercent,
      })),
      {
        onSuccess: () => {
          toast.success(`${affected.length} materi diisi ${normalizedPercent}%`)
          setOpen(false)
        },
        onError: (error: unknown) => {
          toast.error(
            error instanceof Error ? error.message : 'Gagal mengisi materi'
          )
        },
      }
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type='button' variant='outline' className='min-h-11'>
          Fill all
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[min(20rem,calc(100vw-2rem))]'>
        <div className='flex flex-col gap-3'>
          <div>
            <p className='text-sm font-semibold'>Isi jenjang {levelLabel}</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              {emptyCount} materi belum terisi. Nilai yang sudah ada tidak
              berubah.
            </p>
          </div>
          <label
            className='flex flex-col gap-1 text-xs font-medium'
            htmlFor='target-fill-percent'
          >
            Realisasi (%)
            <div className='relative'>
              <Input
                id='target-fill-percent'
                type='number'
                min={0}
                max={100}
                value={percent}
                onChange={(event) =>
                  onPercentChange(Number(event.target.value))
                }
                className='min-h-11 pr-9 tabular-nums'
              />
              <span className='pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground'>
                %
              </span>
            </div>
          </label>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              type='button'
              className='min-h-11 flex-1'
              disabled={emptyCount === 0 || bulkUpsert.isPending}
              onClick={() => apply(false)}
            >
              {bulkUpsert.isPending ? (
                <Loader2 className='animate-spin' />
              ) : null}
              Isi yang kosong ({emptyCount})
            </Button>
            <Button
              type='button'
              variant='outline'
              className='min-h-11 flex-1'
              disabled={bulkUpsert.isPending}
              onClick={() => apply(true)}
            >
              Timpa semua nilai
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CharacterTargetRow({
  existing,
  ...props
}: {
  report: MonthlyReportRow
  item: CharacterTargetItemRow
  existing: CharacterTargetReportRow | undefined
  readOnly: boolean
}) {
  return (
    <CharacterTargetRowDraft
      key={existing?.updated_at}
      existing={existing}
      {...props}
    />
  )
}

function CharacterTargetRowDraft({
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
  const [values, setValues] = useReducer(
    (
      current: {
        realization: string
        materialGap: string
        notes: string
        detailsOpen: boolean
      },
      change: Partial<typeof current>
    ) => ({ ...current, ...change }),
    {
      realization: existing?.realization_percent?.toString() ?? '',
      materialGap: existing?.material_gap ?? '',
      notes: existing?.notes ?? '',
      detailsOpen: Boolean(existing?.notes || existing?.material_gap),
    }
  )
  const { realization, materialGap, notes, detailsOpen } = values
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  )
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const save = (patch: {
    realization_percent?: number | null
    material_gap?: string | null
    notes?: string | null
  }) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')
    upsert.mutate(
      {
        monthly_report_id: report.id,
        target_item_id: item.id,
        ...patch,
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

  const targetReference = [item.reference_from, item.reference_to]
    .filter(Boolean)
    .join(' – ')
  const saveRealization = () => {
    const numeric = Number(realization)
    const next =
      realization.trim() === '' || !Number.isFinite(numeric)
        ? null
        : Math.max(0, Math.min(100, numeric))
    if (next === existing?.realization_percent) return
    setValues({ realization: next?.toString() ?? '' })
    save({ realization_percent: next })
  }
  const saveText = (field: 'material_gap' | 'notes', value: string) => {
    const next = value.trim() || null
    if (next === existing?.[field]) return
    save({ [field]: next })
  }

  return (
    <div className='grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_9rem] lg:items-start lg:gap-6'>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <p className='text-sm leading-6 font-semibold wrap-break-word whitespace-normal'>
            {item.material_label}
          </p>
          <span
            role='status'
            aria-live='polite'
            className='flex min-h-4 items-center gap-1 text-[10px] text-muted-foreground'
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className='size-3 animate-spin' /> Menyimpan…
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className='size-3' /> Disimpan
              </>
            ) : null}
          </span>
        </div>
        <p className='text-sm leading-5 wrap-break-word whitespace-normal text-muted-foreground'>
          {item.detail_label}
        </p>
        {targetReference ? (
          <p className='mt-1 text-xs text-muted-foreground tabular-nums'>
            Ayat/Hal {targetReference}
          </p>
        ) : null}
        {!detailsOpen && (materialGap || notes) ? (
          <p className='mt-1 line-clamp-1 text-xs text-muted-foreground'>
            {[materialGap && `Kurang materi: ${materialGap}`, notes]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </div>

      <label
        className='flex min-w-0 flex-col gap-1 text-xs font-medium'
        htmlFor={`realization-${item.id}`}
      >
        Realisasi (%)
        <Input
          id={`realization-${item.id}`}
          type='number'
          inputMode='decimal'
          min={0}
          max={100}
          value={realization}
          onChange={(event) => setValues({ realization: event.target.value })}
          onBlur={saveRealization}
          disabled={readOnly || upsert.isPending}
          placeholder='0–100'
          className='min-h-11 text-base tabular-nums sm:text-sm'
        />
      </label>

      {materialGap || notes || !readOnly ? (
        <Collapsible
          open={detailsOpen}
          onOpenChange={(detailsOpen) => setValues({ detailsOpen })}
          className='lg:col-span-2'
        >
          {!readOnly ? (
            <CollapsibleTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                className='min-h-11 px-2 text-muted-foreground'
              >
                <MessageSquareText data-icon='inline-start' />
                {detailsOpen ? 'Tutup catatan' : 'Catatan'}
              </Button>
            </CollapsibleTrigger>
          ) : null}
          <CollapsibleContent className='pt-2'>
            <div className='grid gap-3 rounded-md bg-muted/30 p-3 sm:grid-cols-2'>
              <OptionalInput
                label='Kurang materi'
                value={materialGap}
                onChange={(materialGap) => setValues({ materialGap })}
                onBlur={() => saveText('material_gap', materialGap)}
                onRemove={() => {
                  setValues({ materialGap: '' })
                  save({ material_gap: null })
                }}
                placeholder='Tuliskan materi yang belum tercapai'
                disabled={readOnly || upsert.isPending}
                removeLabel='Hapus kurang materi'
              />
              <OptionalInput
                label='Catatan'
                value={notes}
                onChange={(notes) => setValues({ notes })}
                onBlur={() => saveText('notes', notes)}
                onRemove={() => {
                  setValues({ notes: '' })
                  save({ notes: null })
                }}
                placeholder='Tambahkan catatan singkat'
                disabled={readOnly || upsert.isPending}
                removeLabel='Hapus catatan'
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

function OptionalInput({
  label,
  value,
  onChange,
  onBlur,
  onRemove,
  placeholder,
  disabled,
  removeLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onRemove: () => void
  placeholder: string
  disabled: boolean
  removeLabel: string
}) {
  return (
    <label className='flex min-w-0 flex-col gap-1 text-xs font-medium'>
      {label}
      <span className='flex min-w-0 items-center gap-1'>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className='min-h-11 min-w-0 flex-1 text-base sm:text-sm'
        />
        {!disabled && value ? (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-11 shrink-0'
            onClick={onRemove}
            aria-label={removeLabel}
          >
            <X />
          </Button>
        ) : null}
      </span>
    </label>
  )
}
