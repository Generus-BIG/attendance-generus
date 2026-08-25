import {
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringReportRow,
  type MonthlyReportRow,
  type SensusRow,
  type SensusSnapshotRow,
} from '../../../types'
import {
  CHARACTER_LEVELS,
  CHARACTER_STATUS_CODES,
  CHARACTER_STATUS_META,
  type CharacterMonitoringJoinedRow,
  type CharacterMonitoringStatus,
  countCharacterStatuses,
  normalizeCharacterStatus,
  sortCharacterActivities,
  sortCharacterAgendaRows,
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
import {
  buildMonitoringRecapRows,
  monitoringSensusTotal,
} from './character-recap-utils'

interface SlideArgs {
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  activities: CharacterMonitoringActivityRow[]
  characterReports: CharacterMonitoringReportRow[]
  sensusSnapshots: SensusSnapshotRow[]
  masterSensus: SensusRow[]
  derivedSensus: Pick<
    SensusSnapshotRow,
    'kelompok_id' | 'category_code' | 'count'
  >[]
  slideNumber: number
  totalSlides: number
}

const PRIORITY_STATUS: CharacterMonitoringStatus = 'needs_guidance'

const STATUS_TONES: Record<CharacterMonitoringStatus, string> = {
  needs_guidance: 'oklch(0.58 0.22 27)',
  not_applied: 'oklch(0.64 0.18 48)',
  in_progress: 'oklch(0.7 0.16 80)',
  consistent: 'oklch(0.62 0.16 125)',
  established: 'oklch(0.57 0.15 155)',
}

function statusColors(
  status: CharacterMonitoringStatus,
  p: PresPalette
): { background: string; color: string; border: string } {
  const tone = STATUS_TONES[status]
  return {
    background: `color-mix(in oklch, ${tone} 14%, ${p.bg})`,
    color: `color-mix(in oklch, ${tone} 78%, ${p.ink})`,
    border: `color-mix(in oklch, ${tone} 65%, ${p.rule})`,
  }
}

function StatusChip({
  status,
  count,
}: {
  status: CharacterMonitoringStatus
  count?: number
}) {
  const p = usePresPalette()
  const colors = statusColors(status, p)
  return (
    <span
      className='inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1 align-middle'
      style={{
        background: colors.background,
        borderColor: colors.border,
        color: colors.color,
        fontFamily: p.fontMono,
        fontSize: 'clamp(0.68rem, 0.9vw, 0.95rem)',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <span className='whitespace-normal'>
        {CHARACTER_STATUS_META[status].label}
      </span>
      {count != null ? <span>{count}</span> : null}
    </span>
  )
}

function buildScopedData(
  args: Pick<
    SlideArgs,
    'effectiveKelompokList' | 'reports' | 'activities' | 'characterReports'
  >
) {
  const { effectiveKelompokList, reports, activities, characterReports } = args
  const kelompokIds = new Set(effectiveKelompokList.map((k) => k.id))
  const scopedReports = reports.filter((report) =>
    kelompokIds.has(report.kelompok_id)
  )
  const reportIds = new Set(scopedReports.map((report) => report.id))
  const activityIds = new Set(activities.map((activity) => activity.id))
  const scopedRows = characterReports.filter(
    (row) =>
      reportIds.has(row.monthly_report_id) && activityIds.has(row.activity_id)
  )
  const sortedActivities = sortCharacterActivities(activities)
  return { scopedReports, scopedRows, sortedActivities }
}

function buildAgendaRows(
  args: Pick<
    SlideArgs,
    'effectiveKelompokList' | 'reports' | 'activities' | 'characterReports'
  >
) {
  const { effectiveKelompokList, activities } = args
  const { scopedReports, scopedRows } = buildScopedData(args)
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity])
  )
  const monthlyReportById = new Map(
    scopedReports.map((report) => [report.id, report])
  )
  const kelompokById = new Map(
    effectiveKelompokList.map((k) => [k.id, k.value])
  )

  const joined: CharacterMonitoringJoinedRow[] = []
  for (const row of scopedRows) {
    const status = normalizeCharacterStatus(row.status)
    if (status !== PRIORITY_STATUS) continue

    const activity = activityById.get(row.activity_id)
    const monthlyReport = monthlyReportById.get(row.monthly_report_id)
    if (!activity || !monthlyReport) continue

    joined.push({
      report: row,
      activity,
      monthlyReport,
      kelompokName:
        kelompokById.get(monthlyReport.kelompok_id) ??
        monthlyReport.kelompok_id,
    })
  }

  return sortCharacterAgendaRows(joined)
}

function buildStatusCounts(
  args: Pick<
    SlideArgs,
    'effectiveKelompokList' | 'reports' | 'activities' | 'characterReports'
  >
) {
  const { scopedReports, scopedRows, sortedActivities } = buildScopedData(args)
  const counts = countCharacterStatuses(scopedRows)
  const assessedCells = new Set(
    scopedRows
      .filter((row) => normalizeCharacterStatus(row.status) !== null)
      .map((row) => `${row.monthly_report_id}_${row.activity_id}`)
  )
  const totalPossible = scopedReports.length * sortedActivities.length
  return {
    counts,
    unassessed: Math.max(0, totalPossible - assessedCells.size),
    scopedReports,
    scopedRows,
    sortedActivities,
  }
}

function AgendaBody(
  args: Pick<
    SlideArgs,
    | 'effectiveKelompokList'
    | 'reports'
    | 'activities'
    | 'characterReports'
    | 'isSingleKelompok'
  >
) {
  const p = usePresPalette()
  const agendaRows = buildAgendaRows(args)

  return (
    <DataPane>
      {agendaRows.length === 0 ? (
        <div
          className='flex h-full items-center justify-center text-center'
          style={{
            color: p.muted,
            fontSize: 'clamp(1.25rem, 2vw, 2rem)',
            fontWeight: 600,
          }}
        >
          Tidak ada agenda prioritas 29 Karakter.
        </div>
      ) : (
        <div className='grid gap-4'>
          {agendaRows.map((row, index) => {
            const status = normalizeCharacterStatus(row.report.status)
            if (!status) return null
            return (
              <div
                key={row.report.id}
                className={
                  args.isSingleKelompok
                    ? 'grid grid-cols-[4rem_minmax(0,0.55fr)_minmax(0,1.4fr)_minmax(0,1.5fr)] gap-5 border-b pb-4'
                    : 'grid grid-cols-[4rem_minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1.5fr)] gap-5 border-b pb-4'
                }
                style={{ borderColor: p.rule }}
              >
                <div
                  style={{
                    color: p.muted,
                    fontFamily: p.fontMono,
                    fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className='min-w-0'>
                  <div
                    className='uppercase'
                    style={{
                      color: p.muted,
                      fontFamily: p.fontMono,
                      fontSize: 'clamp(0.7rem, 0.9vw, 0.95rem)',
                      letterSpacing: '0.16em',
                    }}
                  >
                    {row.activity.level_code}
                  </div>
                  {!args.isSingleKelompok ? (
                    <div
                      className='whitespace-normal'
                      style={{
                        color: p.primary,
                        fontSize: 'clamp(1rem, 1.35vw, 1.45rem)',
                        fontWeight: 800,
                      }}
                    >
                      {row.kelompokName}
                    </div>
                  ) : null}
                </div>
                <div
                  className='min-w-0 whitespace-normal'
                  style={{
                    color: p.ink,
                    fontSize: 'clamp(1rem, 1.35vw, 1.45rem)',
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {row.activity.activity_label}
                </div>
                <div className='min-w-0'>
                  <StatusChip status={status} />
                  <div
                    className='mt-2 whitespace-normal'
                    style={{
                      color: p.muted,
                      fontSize: 'clamp(0.875rem, 1.1vw, 1.15rem)',
                      lineHeight: 1.35,
                    }}
                  >
                    {row.report.notes || 'Catatan pembinaan belum diisi.'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DataPane>
  )
}

function SummaryBody(
  args: Pick<
    SlideArgs,
    | 'effectiveKelompokList'
    | 'reports'
    | 'activities'
    | 'characterReports'
    | 'isSingleKelompok'
  >
) {
  const p = usePresPalette()
  const { counts, unassessed, scopedReports, scopedRows, sortedActivities } =
    buildStatusCounts(args)
  const max = Math.max(
    ...CHARACTER_STATUS_CODES.map((status) => counts[status]),
    1
  )

  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const report of scopedReports)
    reportByKelompok.set(report.kelompok_id, report)

  const rowsByReport = new Map<string, CharacterMonitoringReportRow[]>()
  for (const row of scopedRows) {
    const existing = rowsByReport.get(row.monthly_report_id) ?? []
    existing.push(row)
    rowsByReport.set(row.monthly_report_id, existing)
  }

  return (
    <div className='grid h-full grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-10 overflow-hidden'>
      <div className='flex min-h-0 flex-col gap-4'>
        {CHARACTER_STATUS_CODES.map((status) => (
          <div
            key={status}
            className='grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-4'
          >
            <div className='min-w-0'>
              <StatusChip status={status} count={counts[status]} />
              <div
                className='mt-2 h-2 overflow-hidden rounded-full'
                style={{
                  background: `color-mix(in oklch, ${p.rule} 70%, ${p.bg})`,
                }}
              >
                <div
                  className='h-full rounded-full'
                  style={{
                    width: `${Math.round((counts[status] / max) * 100)}%`,
                    background: statusColors(status, p).border,
                  }}
                />
              </div>
            </div>
            <div
              className='text-right tabular-nums'
              style={{
                color: p.ink,
                fontFamily: p.fontMono,
                fontSize: 'clamp(1.5rem, 2.8vw, 3rem)',
                fontWeight: 800,
              }}
            >
              {counts[status]}
            </div>
          </div>
        ))}
        <div className='grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-4'>
          <div
            style={{
              color: p.muted,
              fontFamily: p.fontMono,
              fontSize: 'clamp(0.68rem, 0.9vw, 0.95rem)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Belum dinilai
          </div>
          <div
            className='text-right tabular-nums'
            style={{
              color: p.muted,
              fontFamily: p.fontMono,
              fontSize: 'clamp(1.5rem, 2.8vw, 3rem)',
              fontWeight: 800,
            }}
          >
            {unassessed}
          </div>
        </div>
      </div>

      <DataPane>
        <div className='grid gap-3'>
          {args.isSingleKelompok
            ? CHARACTER_LEVELS.map((level) => {
                const report = scopedReports[0]
                const reportRows = report
                  ? (rowsByReport.get(report.id) ?? [])
                  : []
                const byActivity = new Map(
                  reportRows.map((row) => [row.activity_id, row])
                )
                const levelActivities = sortedActivities.filter(
                  (activity) => activity.level_code === level
                )
                if (levelActivities.length === 0) return null

                const levelCounts = {
                  needs_guidance: 0,
                  not_applied: 0,
                  in_progress: 0,
                  consistent: 0,
                  established: 0,
                } satisfies Record<CharacterMonitoringStatus, number>
                let levelUnassessed = 0

                for (const activity of levelActivities) {
                  const status = normalizeCharacterStatus(
                    byActivity.get(activity.id)?.status
                  )
                  if (status) levelCounts[status] += 1
                  else levelUnassessed += 1
                }

                return (
                  <div
                    key={level}
                    className='grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-4 border-b py-3'
                    style={{ borderColor: p.rule }}
                  >
                    <div
                      style={{
                        color: p.ink,
                        fontFamily: p.fontMono,
                        fontSize: 'clamp(1rem, 1.35vw, 1.45rem)',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {level}
                    </div>
                    <div className='flex min-w-0 flex-wrap justify-end gap-1.5'>
                      {!report ? (
                        <span
                          className='inline-flex items-center rounded-md border px-2.5 py-1'
                          style={{
                            borderColor: p.rule,
                            color: p.muted,
                            fontFamily: p.fontMono,
                            fontSize: 'clamp(0.68rem, 0.9vw, 0.95rem)',
                            fontWeight: 700,
                          }}
                        >
                          Laporan belum dibuat
                        </span>
                      ) : (
                        <>
                          {CHARACTER_STATUS_CODES.map((status) =>
                            levelCounts[status] > 0 ? (
                              <StatusChip
                                key={status}
                                status={status}
                                count={levelCounts[status]}
                              />
                            ) : null
                          )}
                          {levelUnassessed > 0 ? (
                            <span
                              className='inline-flex items-center rounded-md border px-2.5 py-1'
                              style={{
                                borderColor: p.rule,
                                color: p.muted,
                                fontFamily: p.fontMono,
                                fontSize: 'clamp(0.68rem, 0.9vw, 0.95rem)',
                                fontWeight: 700,
                              }}
                            >
                              Belum dinilai {levelUnassessed}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            : args.effectiveKelompokList.map((kelompok) => {
                const report = reportByKelompok.get(kelompok.id)
                const reportRows = report
                  ? (rowsByReport.get(report.id) ?? [])
                  : []
                const byActivity = new Map(
                  reportRows.map((row) => [row.activity_id, row])
                )
                const kelompokCounts = {
                  needs_guidance: 0,
                  not_applied: 0,
                  in_progress: 0,
                  consistent: 0,
                  established: 0,
                } satisfies Record<CharacterMonitoringStatus, number>
                let kelompokUnassessed = 0

                for (const activity of sortedActivities) {
                  const status = normalizeCharacterStatus(
                    byActivity.get(activity.id)?.status
                  )
                  if (status) kelompokCounts[status] += 1
                  else kelompokUnassessed += 1
                }

                return (
                  <div
                    key={kelompok.id}
                    className='grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-4 border-b py-2'
                    style={{ borderColor: p.rule }}
                  >
                    <div
                      className='min-w-0 whitespace-normal'
                      style={{
                        color: p.ink,
                        fontSize: 'clamp(0.95rem, 1.2vw, 1.25rem)',
                        fontWeight: 800,
                      }}
                    >
                      {kelompok.value}
                    </div>
                    <div className='flex min-w-0 flex-wrap justify-end gap-1.5'>
                      {!report ? (
                        <span
                          className='inline-flex items-center rounded-md border px-2.5 py-1'
                          style={{
                            borderColor: p.rule,
                            color: p.muted,
                            fontFamily: p.fontMono,
                            fontSize: 'clamp(0.68rem, 0.9vw, 0.95rem)',
                            fontWeight: 700,
                          }}
                        >
                          Laporan belum dibuat
                        </span>
                      ) : (
                        <>
                          {CHARACTER_STATUS_CODES.map((status) =>
                            kelompokCounts[status] > 0 ? (
                              <StatusChip
                                key={status}
                                status={status}
                                count={kelompokCounts[status]}
                              />
                            ) : null
                          )}
                          {kelompokUnassessed > 0 ? (
                            <span
                              className='inline-flex items-center rounded-md border px-2.5 py-1'
                              style={{
                                borderColor: p.rule,
                                color: p.muted,
                                fontFamily: p.fontMono,
                                fontSize: 'clamp(0.68rem, 0.9vw, 0.95rem)',
                                fontWeight: 700,
                              }}
                            >
                              Belum dinilai {kelompokUnassessed}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
        </div>
      </DataPane>
    </div>
  )
}

export function renderCharacterAgendaSlide(args: SlideArgs): Slide {
  const {
    monthLabel,
    scope,
    isSingleKelompok,
    effectiveKelompokList,
    reports,
    activities,
    characterReports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'character-agenda',
    title: 'Penerapan 29 Karakter — Perlu Pembinaan',
    render: () => (
      <SlideFrame
        eyebrow='PENERAPAN 29 KARAKTER'
        title='Perlu Pembinaan'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <AgendaBody
          effectiveKelompokList={effectiveKelompokList}
          isSingleKelompok={isSingleKelompok}
          reports={reports}
          activities={activities}
          characterReports={characterReports}
        />
      </SlideFrame>
    ),
  }
}

export function renderCharacterSummarySlide(args: SlideArgs): Slide {
  const {
    monthLabel,
    scope,
    isSingleKelompok,
    effectiveKelompokList,
    reports,
    activities,
    characterReports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'character-summary',
    title: 'Penerapan 29 Karakter',
    render: () => (
      <SlideFrame
        eyebrow='PENERAPAN 29 KARAKTER'
        title='Distribusi Penerapan'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <SummaryBody
          effectiveKelompokList={effectiveKelompokList}
          isSingleKelompok={isSingleKelompok}
          reports={reports}
          activities={activities}
          characterReports={characterReports}
        />
      </SlideFrame>
    ),
  }
}

function MonitoringValue({
  status,
}: {
  status: CharacterMonitoringStatus | null
}) {
  const p = usePresPalette()
  if (!status) {
    return (
      <EditorialTableCell className='text-right' style={{ color: p.muted }}>
        Belum
      </EditorialTableCell>
    )
  }
  return (
    <EditorialTableCell
      className='max-w-[14ch] text-right wrap-break-word whitespace-normal'
      style={{ color: statusColors(status, p).color, fontWeight: 700 }}
    >
      {CHARACTER_STATUS_META[status].label}
    </EditorialTableCell>
  )
}

function MonitoringRecapBody({
  isSingleKelompok,
  effectiveKelompokList,
  reports,
  activities,
  characterReports,
  masterSensus,
  derivedSensus,
  level,
}: Pick<
  SlideArgs,
  | 'isSingleKelompok'
  | 'effectiveKelompokList'
  | 'reports'
  | 'activities'
  | 'characterReports'
  | 'masterSensus'
  | 'derivedSensus'
> & { level?: CharacterLevelCode }) {
  const levels = level ? [level] : CHARACTER_LEVELS
  const p = usePresPalette()
  return (
    <DataPane>
      <EditorialTable density='micro'>
        <EditorialTableHeader>
          <EditorialTableRow>
            <EditorialTableHead>Kategori</EditorialTableHead>
            <EditorialTableHead>Kegiatan</EditorialTableHead>
            {isSingleKelompok ? (
              <>
                <EditorialTableHead className='text-right'>
                  Sensus
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Status
                </EditorialTableHead>
              </>
            ) : (
              <>
                <EditorialTableHead className='text-right'>
                  Sensus
                </EditorialTableHead>
                {effectiveKelompokList.map((kelompok) => (
                  <EditorialTableHead key={kelompok.id} className='text-right'>
                    {kelompok.value}
                  </EditorialTableHead>
                ))}
                <EditorialTableHead className='text-right'>
                  Desa
                </EditorialTableHead>
              </>
            )}
          </EditorialTableRow>
        </EditorialTableHeader>
        <EditorialTableBody>
          {levels.flatMap((currentLevel) => {
            const sensus = monitoringSensusTotal(
              currentLevel,
              masterSensus,
              derivedSensus,
              effectiveKelompokList
            )
            const rows = buildMonitoringRecapRows(
              currentLevel,
              activities,
              characterReports,
              reports,
              effectiveKelompokList
            )
            return [
              ...rows.map((row, index) => (
                <EditorialTableRow key={row.activity.id}>
                  {index === 0 ? (
                    <EditorialTableCell
                      rowSpan={rows.length}
                      className='align-middle font-semibold'
                      style={{
                        background: `color-mix(in oklch, ${p.success} 10%, transparent)`,
                      }}
                    >
                      {currentLevel}
                    </EditorialTableCell>
                  ) : null}
                  <EditorialTableCell className='max-w-[30ch] wrap-break-word whitespace-normal'>
                    {row.activity.activity_label}
                  </EditorialTableCell>
                  {isSingleKelompok ? (
                    <>
                      {index === 0 ? (
                        <EditorialTableCell
                          rowSpan={rows.length}
                          className='text-right align-middle tabular-nums'
                        >
                          {sensus}
                        </EditorialTableCell>
                      ) : null}
                      <MonitoringValue status={row.statuses[0] ?? null} />
                    </>
                  ) : (
                    <>
                      {index === 0 ? (
                        <EditorialTableCell
                          rowSpan={rows.length}
                          className='text-right align-middle tabular-nums'
                        >
                          {sensus}
                        </EditorialTableCell>
                      ) : null}
                      {row.statuses.map((status, statusIndex) => (
                        <MonitoringValue
                          key={effectiveKelompokList[statusIndex].id}
                          status={status}
                        />
                      ))}
                      <EditorialTableCell className='max-w-[16ch] text-right wrap-break-word whitespace-normal'>
                        {row.desa}
                      </EditorialTableCell>
                    </>
                  )}
                </EditorialTableRow>
              )),
            ]
          })}
        </EditorialTableBody>
      </EditorialTable>
    </DataPane>
  )
}

export function renderCharacterMonitoringRecapSlide(
  args: SlideArgs & { level?: CharacterLevelCode }
): Slide {
  const category = args.level ? ` | ${args.level}` : ''
  return {
    key: `character-monitoring-recap${args.level ? `-${args.level}` : ''}`,
    title: `Target 29 Karakter | Monitoring${category}`,
    render: () => (
      <SlideFrame
        eyebrow='PENERAPAN 29 KARAKTER'
        title={`Target 29 Karakter | Monitoring${category}`}
        meta={args.monthLabel}
        scope={args.scope}
        slideNumber={args.slideNumber}
        totalSlides={args.totalSlides}
      >
        <MonitoringRecapBody {...args} />
      </SlideFrame>
    ),
  }
}
