import {
  type CharacterTargetItemRow,
  type CharacterTargetReportRow,
  type MonthlyReportRow,
} from '../../../types'
import {
  CHARACTER_LEVELS,
  type CharacterLevelCode,
} from '../../../utils/character-monitoring'
import { DataPane } from '../components/data-pane'
import {
  EditorialTable,
  EditorialTableBody,
  EditorialTableCell,
  EditorialTableHead,
  EditorialTableHeader,
  EditorialTableRow,
} from '../components/editorial-table'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { buildTargetRecapLevel } from './character-recap-utils'

interface SlideArgs {
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  targetItems: CharacterTargetItemRow[]
  targetReports: CharacterTargetReportRow[]
  slideNumber: number
  totalSlides: number
}

interface JoinedTargetRow {
  report: MonthlyReportRow
  item: CharacterTargetItemRow
  targetReport?: CharacterTargetReportRow
  kelompokName: string
}

interface TargetSummaryRow {
  level: CharacterLevelCode
  category: string
  total: number
  filled: number
  realizationSum: number
}

const SUMMARY_ROW_LIMIT = 7
const AGENDA_ROW_LIMIT = 6

const levelOrder = new Map(
  CHARACTER_LEVELS.map((level, index) => [level, index])
)

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function isFilled(row: CharacterTargetReportRow | undefined) {
  return (
    row?.realization_percent !== null && row?.realization_percent !== undefined
  )
}

function isPriority(row: CharacterTargetReportRow | undefined) {
  if (!isFilled(row)) return true
  return (row?.realization_percent ?? 0) < 100 || hasText(row?.material_gap)
}

function sortTargetItems(items: CharacterTargetItemRow[]) {
  return [...items].sort((a, b) => {
    const levelDiff =
      (levelOrder.get(a.level_code) ?? 999) -
      (levelOrder.get(b.level_code) ?? 999)
    if (levelDiff !== 0) return levelDiff
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    const categoryDiff = a.category_label.localeCompare(b.category_label)
    if (categoryDiff !== 0) return categoryDiff
    return a.material_label.localeCompare(b.material_label)
  })
}

function buildJoinedRows(
  args: Pick<
    SlideArgs,
    'effectiveKelompokList' | 'reports' | 'targetItems' | 'targetReports'
  >
) {
  const { effectiveKelompokList, reports, targetItems, targetReports } = args
  const kelompokIds = new Set(effectiveKelompokList.map((item) => item.id))
  const kelompokById = new Map(
    effectiveKelompokList.map((item) => [item.id, item.value])
  )
  const scopedReports = reports.filter((report) =>
    kelompokIds.has(report.kelompok_id)
  )
  const reportIds = new Set(scopedReports.map((report) => report.id))
  const targetItemIds = new Set(targetItems.map((item) => item.id))
  const targetReportByCell = new Map<string, CharacterTargetReportRow>()
  for (const row of targetReports) {
    if (
      reportIds.has(row.monthly_report_id) &&
      targetItemIds.has(row.target_item_id)
    ) {
      targetReportByCell.set(
        `${row.monthly_report_id}_${row.target_item_id}`,
        row
      )
    }
  }
  const sortedItems = sortTargetItems(targetItems)

  const joinedRows = scopedReports.flatMap((report) =>
    sortedItems.map((item) => ({
      report,
      item,
      targetReport: targetReportByCell.get(`${report.id}_${item.id}`),
      kelompokName: kelompokById.get(report.kelompok_id) ?? report.kelompok_id,
    }))
  )

  return { joinedRows, scopedReports, sortedItems }
}

function buildSummaryRows(joinedRows: JoinedTargetRow[]) {
  const summaries = new Map<string, TargetSummaryRow>()

  for (const { item, targetReport } of joinedRows) {
    const key = `${item.level_code}__${item.category_label}`
    const summary = summaries.get(key) ?? {
      level: item.level_code,
      category: item.category_label,
      total: 0,
      filled: 0,
      realizationSum: 0,
    }

    summary.total += 1
    if (isFilled(targetReport)) {
      summary.filled += 1
      summary.realizationSum += targetReport?.realization_percent ?? 0
    }
    summaries.set(key, summary)
  }

  return [...summaries.values()].sort((a, b) => {
    const levelDiff =
      (levelOrder.get(a.level) ?? 999) - (levelOrder.get(b.level) ?? 999)
    if (levelDiff !== 0) return levelDiff
    return a.category.localeCompare(b.category)
  })
}

function buildAgendaRows(joinedRows: JoinedTargetRow[]) {
  return joinedRows
    .filter(({ targetReport }) => isPriority(targetReport))
    .sort((a, b) => {
      const aFilled = isFilled(a.targetReport)
      const bFilled = isFilled(b.targetReport)
      if (aFilled !== bFilled) return aFilled ? 1 : -1

      const realizationDiff =
        (a.targetReport?.realization_percent ?? -1) -
        (b.targetReport?.realization_percent ?? -1)
      if (realizationDiff !== 0) return realizationDiff

      const gapDiff =
        Number(hasText(b.targetReport?.material_gap)) -
        Number(hasText(a.targetReport?.material_gap))
      if (gapDiff !== 0) return gapDiff

      const kelompokDiff = a.kelompokName.localeCompare(b.kelompokName)
      if (kelompokDiff !== 0) return kelompokDiff

      const levelDiff =
        (levelOrder.get(a.item.level_code) ?? 999) -
        (levelOrder.get(b.item.level_code) ?? 999)
      if (levelDiff !== 0) return levelDiff
      return a.item.sort_order - b.item.sort_order
    })
}

function progressTone(value: number | null, p: PresPalette) {
  if (value === null) return p.muted
  if (value >= 100) return p.success
  if (value >= 75) return p.primary
  return p.warning
}

function EmptyState({ children }: { children: string }) {
  const p = usePresPalette()
  return (
    <div
      className='flex h-full items-center justify-center text-center text-pretty'
      style={{
        color: p.muted,
        fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: string
}) {
  const p = usePresPalette()
  return (
    <div
      className='min-w-0 rounded-2xl px-5 py-4'
      style={{
        background: `color-mix(in oklch, ${tone} 9%, ${p.bg})`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${tone} 24%, transparent)`,
      }}
    >
      <div
        className='uppercase'
        style={{
          color: p.muted,
          fontFamily: p.fontMono,
          fontSize: 'clamp(0.67rem, 0.8vw, 0.86rem)',
          fontWeight: 700,
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </div>
      <div
        className='mt-1 tabular-nums'
        style={{
          color: tone,
          fontFamily: p.fontMono,
          fontSize: 'clamp(1.6rem, 2.9vw, 3.1rem)',
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        className='mt-1 text-pretty'
        style={{
          color: p.muted,
          fontSize: 'clamp(0.75rem, 0.9vw, 0.98rem)',
          lineHeight: 1.35,
        }}
      >
        {detail}
      </div>
    </div>
  )
}

function OverflowNotice({ count }: { count: number }) {
  const p = usePresPalette()
  if (count <= 0) return null
  return (
    <div
      className='pt-3 text-center uppercase'
      style={{
        color: p.muted,
        fontFamily: p.fontMono,
        fontSize: 'clamp(0.7rem, 0.85vw, 0.9rem)',
        fontWeight: 700,
        letterSpacing: '0.12em',
      }}
    >
      +{count} lainnya — buka laporan untuk rincian lengkap
    </div>
  )
}

function SummaryBody(
  args: Pick<
    SlideArgs,
    'effectiveKelompokList' | 'reports' | 'targetItems' | 'targetReports'
  >
) {
  const p = usePresPalette()
  const { joinedRows, scopedReports } = buildJoinedRows(args)
  const summaryRows = buildSummaryRows(joinedRows)
  const agendaRows = buildAgendaRows(joinedRows)
  const filledRows = joinedRows.filter(({ targetReport }) =>
    isFilled(targetReport)
  )
  const average =
    filledRows.length > 0
      ? Math.round(
          filledRows.reduce(
            (sum, { targetReport }) =>
              sum + (targetReport?.realization_percent ?? 0),
            0
          ) / filledRows.length
        )
      : null
  const hiddenCount = Math.max(0, summaryRows.length - SUMMARY_ROW_LIMIT)

  if (args.targetItems.length === 0) {
    return (
      <EmptyState>Belum ada target materi aktif untuk bulan ini.</EmptyState>
    )
  }
  if (scopedReports.length === 0) {
    return <EmptyState>Belum ada laporan pada cakupan ini.</EmptyState>
  }

  return (
    <div className='grid h-full grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden'>
      <div className='grid grid-cols-3 gap-4'>
        <KpiCard
          label='Rata-rata capaian'
          value={average === null ? '—' : `${average}%`}
          detail='Dihitung dari progres yang sudah diisi.'
          tone={progressTone(average, p)}
        />
        <KpiCard
          label='Progres terisi'
          value={`${filledRows.length}/${joinedRows.length}`}
          detail='Kekurangan materi dan catatan tetap bersifat opsional.'
          tone={p.primary}
        />
        <KpiCard
          label='Perlu ditinjau'
          value={String(agendaRows.length)}
          detail='Belum diisi, di bawah 100%, atau memiliki kekurangan materi.'
          tone={p.warning}
        />
      </div>

      <DataPane>
        <div className='grid gap-2'>
          {summaryRows.slice(0, SUMMARY_ROW_LIMIT).map((row) => {
            const averageProgress =
              row.filled > 0
                ? Math.round(row.realizationSum / row.filled)
                : null
            const completionPercent =
              row.total > 0 ? Math.round((row.filled / row.total) * 100) : 0

            return (
              <div
                key={`${row.level}_${row.category}`}
                className='grid grid-cols-[minmax(0,1.15fr)_minmax(8rem,0.85fr)_7rem_6rem] items-center gap-5 border-b py-2.5'
                style={{ borderColor: p.rule }}
              >
                <div className='min-w-0'>
                  <div
                    className='uppercase'
                    style={{
                      color: p.primary,
                      fontFamily: p.fontMono,
                      fontSize: 'clamp(0.68rem, 0.82vw, 0.9rem)',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {row.level}
                  </div>
                  <div
                    className='text-pretty whitespace-normal'
                    style={{
                      color: p.ink,
                      fontSize: 'clamp(0.9rem, 1.1vw, 1.2rem)',
                      fontWeight: 700,
                      lineHeight: 1.25,
                    }}
                  >
                    {row.category}
                  </div>
                </div>

                <div className='min-w-0'>
                  <div
                    className='h-2 overflow-hidden rounded-full'
                    style={{
                      background: `color-mix(in oklch, ${p.rule} 70%, ${p.bg})`,
                    }}
                  >
                    <div
                      className='h-full rounded-full'
                      style={{
                        width: `${completionPercent}%`,
                        background: p.primary,
                      }}
                    />
                  </div>
                </div>

                <div
                  className='text-right tabular-nums'
                  style={{
                    color: p.ink,
                    fontFamily: p.fontMono,
                    fontSize: 'clamp(0.9rem, 1.1vw, 1.15rem)',
                    fontWeight: 700,
                  }}
                >
                  {row.filled}/{row.total} terisi
                </div>

                <div
                  className='text-right tabular-nums'
                  style={{
                    color: progressTone(averageProgress, p),
                    fontFamily: p.fontMono,
                    fontSize: 'clamp(1rem, 1.35vw, 1.4rem)',
                    fontWeight: 800,
                  }}
                >
                  {averageProgress === null ? '—' : `${averageProgress}%`}
                </div>
              </div>
            )
          })}
        </div>
        <OverflowNotice count={hiddenCount} />
      </DataPane>
    </div>
  )
}

function AgendaBody(
  args: Pick<
    SlideArgs,
    | 'isSingleKelompok'
    | 'effectiveKelompokList'
    | 'reports'
    | 'targetItems'
    | 'targetReports'
  >
) {
  const p = usePresPalette()
  const { joinedRows, scopedReports } = buildJoinedRows(args)
  const agendaRows = buildAgendaRows(joinedRows)
  const hiddenCount = Math.max(0, agendaRows.length - AGENDA_ROW_LIMIT)

  if (args.targetItems.length === 0) {
    return (
      <EmptyState>Belum ada target materi aktif untuk bulan ini.</EmptyState>
    )
  }
  if (scopedReports.length === 0) {
    return <EmptyState>Belum ada laporan pada cakupan ini.</EmptyState>
  }
  if (agendaRows.length === 0) {
    return <EmptyState>Semua target materi telah mencapai 100%.</EmptyState>
  }

  return (
    <DataPane>
      <div className='grid gap-1'>
        {agendaRows.slice(0, AGENDA_ROW_LIMIT).map((row, index) => {
          const realization = row.targetReport?.realization_percent ?? null
          const materialGap = row.targetReport?.material_gap?.trim()
          const notes = row.targetReport?.notes?.trim()

          return (
            <div
              key={`${row.report.id}_${row.item.id}`}
              className={
                args.isSingleKelompok
                  ? 'grid grid-cols-[3rem_minmax(0,0.74fr)_minmax(0,1.36fr)_6rem_minmax(0,1.2fr)] items-start gap-4 border-b py-3'
                  : 'grid grid-cols-[3rem_minmax(0,0.72fr)_minmax(0,0.72fr)_minmax(0,1.24fr)_6rem_minmax(0,1.15fr)] items-start gap-4 border-b py-3'
              }
              style={{ borderColor: p.rule }}
            >
              <div
                className='tabular-nums'
                style={{
                  color: p.muted,
                  fontFamily: p.fontMono,
                  fontSize: 'clamp(0.75rem, 0.9vw, 0.98rem)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>

              {!args.isSingleKelompok ? (
                <div
                  className='min-w-0 text-pretty whitespace-normal'
                  style={{
                    color: p.primary,
                    fontSize: 'clamp(0.82rem, 1vw, 1.08rem)',
                    fontWeight: 800,
                    lineHeight: 1.3,
                  }}
                >
                  {row.kelompokName}
                </div>
              ) : null}

              <div className='min-w-0'>
                <div
                  className='uppercase'
                  style={{
                    color: p.primary,
                    fontFamily: p.fontMono,
                    fontSize: 'clamp(0.66rem, 0.78vw, 0.84rem)',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                  }}
                >
                  {row.item.level_code} · {row.item.category_label}
                </div>
                <div
                  className='mt-1 text-pretty whitespace-normal'
                  style={{
                    color: p.muted,
                    fontSize: 'clamp(0.74rem, 0.88vw, 0.96rem)',
                    lineHeight: 1.3,
                  }}
                >
                  {row.item.detail_label || 'Target materi'}
                </div>
              </div>

              <div
                className='min-w-0 text-pretty whitespace-normal'
                style={{
                  color: p.ink,
                  fontSize: 'clamp(0.88rem, 1.08vw, 1.18rem)',
                  fontWeight: 750,
                  lineHeight: 1.3,
                }}
              >
                {row.item.material_label}
              </div>

              <div
                className='text-right tabular-nums'
                style={{
                  color: progressTone(realization, p),
                  fontFamily: p.fontMono,
                  fontSize: 'clamp(1rem, 1.35vw, 1.4rem)',
                  fontWeight: 800,
                }}
              >
                {realization === null ? 'Belum' : `${realization}%`}
              </div>

              <div className='min-w-0'>
                {materialGap ? (
                  <div
                    className='text-pretty whitespace-normal'
                    style={{
                      color: p.warning,
                      fontSize: 'clamp(0.8rem, 0.98vw, 1.05rem)',
                      fontWeight: 700,
                      lineHeight: 1.35,
                    }}
                  >
                    Kekurangan: {materialGap}
                  </div>
                ) : (
                  <div
                    style={{
                      color: p.muted,
                      fontSize: 'clamp(0.8rem, 0.98vw, 1.05rem)',
                    }}
                  >
                    Tanpa kekurangan materi
                  </div>
                )}
                {notes ? (
                  <div
                    className='mt-1 text-pretty whitespace-normal'
                    style={{
                      color: p.muted,
                      fontSize: 'clamp(0.72rem, 0.85vw, 0.92rem)',
                      lineHeight: 1.3,
                    }}
                  >
                    Catatan: {notes}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      <OverflowNotice count={hiddenCount} />
    </DataPane>
  )
}

export function renderCharacterTargetSummarySlide(args: SlideArgs): Slide {
  const {
    monthLabel,
    scope,
    effectiveKelompokList,
    reports,
    targetItems,
    targetReports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'character-target-summary',
    title: 'Target Capaian Materi',
    render: () => (
      <SlideFrame
        eyebrow='TARGET CAPAIAN MATERI'
        title='Target Capaian Materi'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <SummaryBody
          effectiveKelompokList={effectiveKelompokList}
          reports={reports}
          targetItems={targetItems}
          targetReports={targetReports}
        />
      </SlideFrame>
    ),
  }
}

export function renderCharacterTargetAgendaSlide(args: SlideArgs): Slide {
  const {
    monthLabel,
    scope,
    isSingleKelompok,
    effectiveKelompokList,
    reports,
    targetItems,
    targetReports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'character-target-agenda',
    title: 'Prioritas Target Materi',
    render: () => (
      <SlideFrame
        eyebrow='TARGET CAPAIAN MATERI'
        title='Prioritas Target Materi'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <AgendaBody
          isSingleKelompok={isSingleKelompok}
          effectiveKelompokList={effectiveKelompokList}
          reports={reports}
          targetItems={targetItems}
          targetReports={targetReports}
        />
      </SlideFrame>
    ),
  }
}

function TargetRecapBody({
  isSingleKelompok,
  effectiveKelompokList,
  reports,
  targetItems,
  targetReports,
  level,
}: Pick<
  SlideArgs,
  | 'isSingleKelompok'
  | 'effectiveKelompokList'
  | 'reports'
  | 'targetItems'
  | 'targetReports'
> & { level: CharacterLevelCode }) {
  const groups = buildTargetRecapLevel(
    targetItems,
    targetReports,
    reports,
    effectiveKelompokList,
    level
  )

  if (groups.length === 0) {
    return (
      <EmptyState>{`Belum ada target materi aktif untuk ${level}.`}</EmptyState>
    )
  }

  return (
    <DataPane>
      <EditorialTable density='micro'>
        <EditorialTableHeader>
          <EditorialTableRow>
            <EditorialTableHead rowSpan={isSingleKelompok ? 1 : 2}>
              Kategori
            </EditorialTableHead>
            <EditorialTableHead rowSpan={isSingleKelompok ? 1 : 2}>
              Materi
            </EditorialTableHead>
            <EditorialTableHead rowSpan={isSingleKelompok ? 1 : 2}>
              Detail materi
            </EditorialTableHead>
            {isSingleKelompok ? (
              <EditorialTableHead className='text-center'>
                Capaian
              </EditorialTableHead>
            ) : (
              <>
                <EditorialTableHead
                  colSpan={effectiveKelompokList.length}
                  className='text-center'
                >
                  Realisasi (%)
                </EditorialTableHead>
                <EditorialTableHead rowSpan={2} className='text-center'>
                  Desa (%)
                </EditorialTableHead>
              </>
            )}
          </EditorialTableRow>
          {!isSingleKelompok ? (
            <EditorialTableRow>
              {effectiveKelompokList.map((kelompok) => (
                <EditorialTableHead
                  key={kelompok.id}
                  className='text-center'
                >
                  {kelompok.value}
                </EditorialTableHead>
              ))}
            </EditorialTableRow>
          ) : null}
        </EditorialTableHeader>
        <EditorialTableBody>
          {groups.flatMap((group) =>
            group.rows.map((row, index) => (
              <EditorialTableRow key={row.item.id}>
                {index === 0 ? (
                  <EditorialTableCell
                    rowSpan={group.rows.length}
                    className='align-middle font-semibold'
                  >
                    {group.category}
                  </EditorialTableCell>
                ) : null}
                <EditorialTableCell className='max-w-[30ch] wrap-break-word whitespace-normal'>
                  {row.item.material_label}
                </EditorialTableCell>
                <EditorialTableCell className='max-w-[54ch] wrap-break-word whitespace-normal'>
                  {row.item.detail_label?.trim() || '—'}
                </EditorialTableCell>
                {isSingleKelompok ? (
                  <TargetValue value={row.values[0] ?? null} />
                ) : (
                  <>
                    {row.values.map((value, valueIndex) => (
                      <TargetValue
                        key={effectiveKelompokList[valueIndex].id}
                        value={value}
                      />
                    ))}
                    <TargetValue value={row.average} />
                  </>
                )}
              </EditorialTableRow>
            ))
          )}
        </EditorialTableBody>
      </EditorialTable>
    </DataPane>
  )
}

function TargetValue({ value }: { value: number | null }) {
  const p = usePresPalette()
  return (
    <EditorialTableCell
      className='text-center font-semibold'
      style={{ color: progressTone(value, p) }}
    >
      {value === null ? 'Belum' : `${value}%`}
    </EditorialTableCell>
  )
}

export function renderCharacterTargetRecapSlide(
  args: SlideArgs & { level: CharacterLevelCode }
): Slide {
  return {
    key: `character-target-recap-${args.level}`,
    title: `Rekap Target Capaian Materi | ${args.level}`,
    render: () => (
      <SlideFrame
        eyebrow='TARGET CAPAIAN MATERI'
        title={`Rekap Target Capaian Materi | ${args.level}`}
        meta={args.monthLabel}
        scope={args.scope}
        slideNumber={args.slideNumber}
        totalSlides={args.totalSlides}
      >
        <TargetRecapBody {...args} />
      </SlideFrame>
    ),
  }
}
