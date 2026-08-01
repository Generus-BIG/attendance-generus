import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, MessageSquareText, X } from 'lucide-react'
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
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [expandedByCategory, setExpandedByCategory] = useState<
    Record<string, string | null>
  >({})
  const [bulkPercent, setBulkPercent] = useState(90)
  const initializedCategoryLevelRef = useRef<CharacterLevelCode | null>(null)

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

  useEffect(() => {
    if (!activeLevel || itemsLoading || reportsLoading) return
    if (initializedCategoryLevelRef.current === activeLevel) return
    const categoryMap = grouped.get(activeLevel)
    if (!categoryMap || categoryMap.size === 0) return
    initializedCategoryLevelRef.current = activeLevel
    const firstIncomplete = [...categoryMap.entries()].find(([, rows]) =>
      rows.some((item) => !isTargetComplete(reportByItem.get(item.id)))
    )
    const nextCategory = firstIncomplete?.[0] ?? null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenCategory(nextCategory)
    const firstIncompleteItem = firstIncomplete?.[1].find(
      (item) => !isTargetComplete(reportByItem.get(item.id))
    )
    if (firstIncompleteItem && nextCategory) {
      const key = `${activeLevel}:${nextCategory}`
      setExpandedByCategory((current) => ({
        ...current,
        [key]: current[key] ?? firstIncompleteItem.id,
      }))
    }
  }, [activeLevel, grouped, itemsLoading, reportByItem, reportsLoading])

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
        action={
          !readOnly && activeLevel && activeCategoryMap ? (
            <TargetFillAll
              reportId={report.id}
              items={[...activeCategoryMap.values()].flat()}
              reportByItem={reportByItem}
              percent={bulkPercent}
              onPercentChange={setBulkPercent}
            />
          ) : undefined
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
            <TabsList className='grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4'>
              {availableLevels.map((level) => {
                const progress = progressByLevel.get(level)
                return (
                  <TabsTrigger
                    key={level}
                    value={level}
                    className='min-h-11 flex-col gap-0.5 px-2'
                  >
                    <span>{CHARACTER_LEVEL_LABELS[level]}</span>
                    <span className='text-[10px] font-normal tabular-nums opacity-75'>
                      {progress?.completed ?? 0}/{progress?.total ?? 0}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>

          <div className='flex flex-col gap-3'>
            {[...(activeCategoryMap?.entries() ?? [])].map(
              ([category, rows]) => {
                const completed = rows.filter((item) =>
                  isTargetComplete(reportByItem.get(item.id))
                ).length
                const categoryKey = `${activeLevel}:${category}`
                const isOpen = openCategory === category
                return (
                  <Collapsible
                    key={categoryKey}
                    open={isOpen}
                    onOpenChange={(nextOpen) => {
                      setOpenCategory(nextOpen ? category : null)
                      if (nextOpen && !expandedByCategory[categoryKey]) {
                        const nextItem =
                          rows.find(
                            (item) =>
                              !isTargetComplete(reportByItem.get(item.id))
                          ) ?? rows[0]
                        setExpandedByCategory((current) => ({
                          ...current,
                          [categoryKey]: nextItem?.id ?? null,
                        }))
                      }
                    }}
                    className='overflow-hidden rounded-lg border'
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='ghost'
                        className='group h-auto min-h-12 w-full justify-between rounded-none px-3 py-2'
                      >
                        <span className='min-w-0 text-left'>
                          <span className='block truncate text-sm font-semibold'>
                            {category}
                          </span>
                          <span className='block text-xs text-muted-foreground tabular-nums'>
                            {completed}/{rows.length} materi
                          </span>
                        </span>
                        <ChevronDown className='transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none' />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className='divide-y border-t'>
                        {rows.map((item) => (
                          <CharacterTargetRow
                            key={item.id}
                            report={report}
                            item={item}
                            existing={reportByItem.get(item.id)}
                            readOnly={readOnly}
                            expanded={
                              expandedByCategory[categoryKey] === item.id
                            }
                            onAdjust={() =>
                              setExpandedByCategory((current) => ({
                                ...current,
                                [categoryKey]: item.id,
                              }))
                            }
                            onCollapse={() =>
                              setExpandedByCategory((current) => ({
                                ...current,
                                [categoryKey]: null,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
  items,
  reportByItem,
  percent,
  onPercentChange,
}: {
  reportId: string
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
        <Button type='button' variant='outline' size='sm'>
          Fill all
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[min(20rem,calc(100vw-2rem))]'>
        <div className='flex flex-col gap-3'>
          <div>
            <p className='text-sm font-semibold'>Fill active jenjang</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Fill all preserves existing values. Overwrite all replaces them.
            </p>
          </div>
          <label
            className='flex flex-col gap-1 text-xs font-medium'
            htmlFor='target-fill-percent'
          >
            Progress
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
                className='min-h-10 pr-9 tabular-nums'
              />
              <span className='pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground'>
                %
              </span>
            </div>
          </label>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              type='button'
              className='flex-1'
              disabled={emptyCount === 0 || bulkUpsert.isPending}
              onClick={() => apply(false)}
            >
              {bulkUpsert.isPending ? (
                <Loader2 className='animate-spin' />
              ) : null}
              Fill all ({emptyCount})
            </Button>
            <Button
              type='button'
              variant='outline'
              className='flex-1'
              disabled={bulkUpsert.isPending}
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

function CharacterTargetRow({
  report,
  item,
  existing,
  readOnly,
  expanded,
  onAdjust,
  onCollapse,
}: {
  report: MonthlyReportRow
  item: CharacterTargetItemRow
  existing: CharacterTargetReportRow | undefined
  readOnly: boolean
  expanded: boolean
  onAdjust: () => void
  onCollapse: () => void
}) {
  const upsert = useUpsertCharacterTargetReport()
  const [realization, setRealization] = useState(
    existing?.realization_percent?.toString() ?? ''
  )
  const [materialGap, setMaterialGap] = useState(existing?.material_gap ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [notesVisible, setNotesVisible] = useState(Boolean(existing?.notes))
  const [materialGapVisible, setMaterialGapVisible] = useState(
    Boolean(existing?.material_gap)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRealization(existing?.realization_percent?.toString() ?? '')
    setMaterialGap(existing?.material_gap ?? '')
    setNotes(existing?.notes ?? '')
    setNotesVisible(Boolean(existing?.notes))
    setMaterialGapVisible(Boolean(existing?.material_gap))
  }, [
    existing?.id,
    existing?.updated_at,
    existing?.realization_percent,
    existing?.material_gap,
    existing?.notes,
  ])

  const save = (next?: {
    realization?: string
    materialGap?: string
    notes?: string
  }) => {
    const rawRealization = next?.realization ?? realization
    const numberValue = Number(rawRealization)
    const parsedRealization =
      rawRealization.trim() === '' || !Number.isFinite(numberValue)
        ? null
        : Math.max(0, Math.min(100, numberValue))
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')
    upsert.mutate(
      {
        monthly_report_id: report.id,
        target_item_id: item.id,
        realization_percent: parsedRealization,
        material_gap: (next?.materialGap ?? materialGap).trim() || null,
        notes: (next?.notes ?? notes).trim() || null,
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

  return (
    <div className='px-3 py-3'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums'>
              {realization ? `${realization}%` : 'Belum diisi'}
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
          <p className='mt-1 text-sm leading-6 font-semibold wrap-break-word whitespace-normal'>
            {item.material_label}
          </p>
          {item.detail_label ? (
            <p className='mt-0.5 text-sm leading-5 wrap-break-word whitespace-normal text-muted-foreground'>
              {item.detail_label}
            </p>
          ) : null}
          {targetReference ? (
            <p className='mt-1 text-xs text-muted-foreground'>
              Target: {targetReference}
            </p>
          ) : null}
          {!expanded && (materialGap || notes) ? (
            <p className='mt-1 line-clamp-1 text-xs text-muted-foreground'>
              {[materialGap && `Kurang: ${materialGap}`, notes]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </div>
        {!readOnly ? (
          <Button
            type='button'
            variant={expanded ? 'ghost' : 'outline'}
            size='sm'
            className='min-h-10 shrink-0 self-start'
            onClick={expanded ? onCollapse : onAdjust}
          >
            {expanded ? 'Done' : 'Adjust'}
          </Button>
        ) : null}
      </div>

      {expanded && !readOnly ? (
        <div className='mt-3 flex flex-col gap-2 rounded-lg bg-muted/20 p-3'>
          <label
            className='flex flex-col gap-1 text-xs font-medium'
            htmlFor={`realization-${item.id}`}
          >
            Progress (%)
            <Input
              id={`realization-${item.id}`}
              type='number'
              min={0}
              max={100}
              value={realization}
              onChange={(event) => setRealization(event.target.value)}
              onBlur={() => save({ realization })}
              disabled={upsert.isPending}
              placeholder='0–100'
              className='min-h-10 tabular-nums sm:max-w-40'
            />
          </label>

          {materialGapVisible ? (
            <OptionalInput
              value={materialGap}
              onChange={setMaterialGap}
              onBlur={() => save({ materialGap })}
              onRemove={() => {
                setMaterialGap('')
                save({ materialGap: '' })
                setMaterialGapVisible(false)
              }}
              placeholder='Kurang materi (opsional)'
              disabled={upsert.isPending}
              removeLabel='Hapus kurang materi'
            />
          ) : null}
          {notesVisible ? (
            <OptionalInput
              value={notes}
              onChange={setNotes}
              onBlur={() => save({ notes })}
              onRemove={() => {
                setNotes('')
                save({ notes: '' })
                setNotesVisible(false)
              }}
              placeholder='Catatan singkat (opsional)'
              disabled={upsert.isPending}
              removeLabel='Hapus catatan'
            />
          ) : null}

          {!materialGapVisible || !notesVisible ? (
            <div className='flex flex-wrap justify-end gap-2'>
              {!materialGapVisible ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='min-h-10'
                  onClick={() => setMaterialGapVisible(true)}
                >
                  + Material gap
                </Button>
              ) : null}
              {!notesVisible ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='min-h-10'
                  onClick={() => setNotesVisible(true)}
                >
                  <MessageSquareText data-icon='inline-start' /> + Note
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function OptionalInput({
  value,
  onChange,
  onBlur,
  onRemove,
  placeholder,
  disabled,
  removeLabel,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onRemove: () => void
  placeholder: string
  disabled: boolean
  removeLabel: string
}) {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className='min-h-10 min-w-0 flex-1 text-xs'
      />
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-10 shrink-0'
        disabled={disabled}
        onClick={onRemove}
        aria-label={removeLabel}
      >
        <X />
      </Button>
    </div>
  )
}
