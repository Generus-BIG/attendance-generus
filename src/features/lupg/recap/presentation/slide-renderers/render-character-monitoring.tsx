import {
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringReportRow,
  type MonthlyReportRow,
} from '../../../types'
import {
  CHARACTER_STATUS_CODES,
  CHARACTER_STATUS_META,
  type CharacterMonitoringJoinedRow,
  type CharacterMonitoringStatus,
  countCharacterStatuses,
  normalizeCharacterStatus,
  sortCharacterActivities,
  sortCharacterAgendaRows,
} from '../../../utils/character-monitoring'
import { DataPane } from '../components/data-pane'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette, type PresPalette } from '../use-pres-palette'

interface SlideArgs {
  monthLabel: string
  scope: string
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  activities: CharacterMonitoringActivityRow[]
  characterReports: CharacterMonitoringReportRow[]
  slideNumber: number
  totalSlides: number
}

const PRIORITY_STATUSES = ['needs_discussion', 'needs_guidance'] as const

function statusColors(
  status: CharacterMonitoringStatus,
  p: PresPalette
): { background: string; color: string; border: string } {
  if (status === 'needs_discussion') {
    return {
      background: `color-mix(in oklch, ${p.chart[4]} 13%, ${p.bg})`,
      color: p.chart[4],
      border: p.chart[4],
    }
  }
  if (status === 'needs_guidance') {
    return {
      background: `color-mix(in oklch, ${p.warning} 16%, ${p.bg})`,
      color: p.warning,
      border: p.warning,
    }
  }
  if (status === 'established') {
    return {
      background: `color-mix(in oklch, ${p.success} 15%, ${p.bg})`,
      color: p.success,
      border: p.success,
    }
  }
  if (status === 'in_progress') {
    return {
      background: `color-mix(in oklch, ${p.warning} 18%, ${p.bg})`,
      color: p.warning,
      border: p.warning,
    }
  }
  return {
    background: `color-mix(in oklch, ${p.muted} 10%, ${p.bg})`,
    color: p.muted,
    border: p.rule,
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
  const scopedRows = characterReports.filter((row) =>
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
    if (status !== PRIORITY_STATUSES[0] && status !== PRIORITY_STATUSES[1]) {
      continue
    }

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
  const { effectiveKelompokList } = args
  const { scopedReports, scopedRows, sortedActivities } = buildScopedData(args)
  const counts = countCharacterStatuses(scopedRows)
  const observedCells = new Set(
    scopedRows.map((row) => `${row.monthly_report_id}_${row.activity_id}`)
  )

  let missing = 0
  for (const report of scopedReports) {
    for (const activity of sortedActivities) {
      if (!observedCells.has(`${report.id}_${activity.id}`)) missing += 1
    }
  }

  const unopened = Math.max(
    0,
    (effectiveKelompokList.length - scopedReports.length) *
      sortedActivities.length
  )
  counts.not_observed += missing + unopened
  return { counts, scopedReports, scopedRows, sortedActivities }
}

function AgendaBody(
  args: Pick<
    SlideArgs,
    'effectiveKelompokList' | 'reports' | 'activities' | 'characterReports'
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
          {agendaRows.slice(0, 12).map((row, index) => {
            const status = normalizeCharacterStatus(row.report.status)
            return (
              <div
                key={row.report.id}
                className='grid grid-cols-[4rem_minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1.5fr)] gap-5 border-b pb-4'
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
                    {row.report.notes || 'Belum ada catatan.'}
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
    'effectiveKelompokList' | 'reports' | 'activities' | 'characterReports'
  >
) {
  const p = usePresPalette()
  const { counts, scopedReports, scopedRows, sortedActivities } =
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
      </div>

      <DataPane>
        <div className='grid gap-3'>
          {args.effectiveKelompokList.map((kelompok) => {
            const report = reportByKelompok.get(kelompok.id)
            const reportRows = report ? (rowsByReport.get(report.id) ?? []) : []
            const byActivity = new Map(
              reportRows.map((row) => [row.activity_id, row])
            )
            const kelompokCounts = {
              needs_discussion: 0,
              needs_guidance: 0,
              not_observed: 0,
              in_progress: 0,
              established: 0,
            } satisfies Record<CharacterMonitoringStatus, number>

            for (const activity of sortedActivities) {
              const status = normalizeCharacterStatus(
                byActivity.get(activity.id)?.status
              )
              kelompokCounts[status] += 1
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
                  {CHARACTER_STATUS_CODES.map((status) =>
                    kelompokCounts[status] > 0 ? (
                      <StatusChip
                        key={status}
                        status={status}
                        count={kelompokCounts[status]}
                      />
                    ) : null
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
    effectiveKelompokList,
    reports,
    activities,
    characterReports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'character-agenda',
    title: 'Agenda 29 Karakter',
    render: () => (
      <SlideFrame
        eyebrow='29 KARAKTER'
        title='Agenda 29 Karakter'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <AgendaBody
          effectiveKelompokList={effectiveKelompokList}
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
    effectiveKelompokList,
    reports,
    activities,
    characterReports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'character-summary',
    title: 'Ringkasan Penerapan 29 Karakter',
    render: () => (
      <SlideFrame
        eyebrow='29 KARAKTER'
        title='Ringkasan Penerapan 29 Karakter'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <SummaryBody
          effectiveKelompokList={effectiveKelompokList}
          reports={reports}
          activities={activities}
          characterReports={characterReports}
        />
      </SlideFrame>
    ),
  }
}
