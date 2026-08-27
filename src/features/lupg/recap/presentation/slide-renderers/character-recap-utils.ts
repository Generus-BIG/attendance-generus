import {
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringReportRow,
  type CharacterMonitoringStatus,
  type CharacterTargetItemRow,
  type CharacterTargetReportRow,
  type MonthlyReportRow,
  type SensusRow,
  type SensusSnapshotRow,
} from '../../../types'
import {
  CHARACTER_LEVELS,
  CHARACTER_STATUS_CODES,
  CHARACTER_STATUS_META,
  normalizeCharacterStatus,
  sortCharacterActivities,
  type CharacterLevelCode,
} from '../../../utils/character-monitoring'

export interface KelompokOption {
  id: string
  value: string
}

export interface TargetRecapRow {
  item: CharacterTargetItemRow
  values: (number | null)[]
  average: number | null
}

export interface TargetRecapGroup {
  level: CharacterLevelCode
  category: string
  rows: TargetRecapRow[]
  average: number | null
}

export interface MonitoringRecapRow {
  activity: CharacterMonitoringActivityRow
  statuses: (CharacterMonitoringStatus | null)[]
  desa: string
}

export function averageFilled(values: readonly (number | null)[]) {
  const filled = values.filter((value): value is number => value !== null)
  return filled.length === 0
    ? null
    : Math.round(filled.reduce((sum, value) => sum + value, 0) / filled.length)
}

export function buildTargetRecapGroups(
  items: CharacterTargetItemRow[],
  targetReports: CharacterTargetReportRow[],
  reports: MonthlyReportRow[],
  kelompok: KelompokOption[]
): TargetRecapGroup[] {
  const reportByKelompok = new Map(
    reports.map((report) => [report.kelompok_id, report])
  )
  const realizationByCell = new Map(
    targetReports.map((report) => [
      `${report.monthly_report_id}:${report.target_item_id}`,
      report.realization_percent,
    ])
  )

  return CHARACTER_LEVELS.flatMap((level) => {
    const byCategory = new Map<string, CharacterTargetItemRow[]>()
    for (const item of items) {
      if (item.level_code !== level) continue
      const group = byCategory.get(item.category_label) ?? []
      group.push(item)
      byCategory.set(item.category_label, group)
    }
    return [...byCategory.entries()]
      .sort(([, a], [, b]) => a[0].sort_order - b[0].sort_order)
      .map(([category, groupItems]) => {
        const rows = groupItems
          .sort(
            (a, b) =>
              a.sort_order - b.sort_order ||
              a.material_label.localeCompare(b.material_label)
          )
          .map((item) => {
            const values = kelompok.map((entry) => {
              const report = reportByKelompok.get(entry.id)
              return report
                ? (realizationByCell.get(`${report.id}:${item.id}`) ?? null)
                : null
            })
            return { item, values, average: averageFilled(values) }
          })
        return {
          level,
          category,
          rows,
          average: averageFilled(rows.flatMap((row) => row.values)),
        }
      })
  })
}

export function buildTargetRecapLevel(
  items: CharacterTargetItemRow[],
  targetReports: CharacterTargetReportRow[],
  reports: MonthlyReportRow[],
  kelompok: KelompokOption[],
  level: CharacterLevelCode
) {
  return buildTargetRecapGroups(items, targetReports, reports, kelompok).filter(
    (group) => group.level === level
  )
}

export function buildMonitoringRecapRows(
  level: CharacterLevelCode,
  activities: CharacterMonitoringActivityRow[],
  characterReports: CharacterMonitoringReportRow[],
  reports: MonthlyReportRow[],
  kelompok: KelompokOption[]
): MonitoringRecapRow[] {
  const reportByKelompok = new Map(
    reports.map((report) => [report.kelompok_id, report])
  )
  const statusByCell = new Map(
    characterReports.map((report) => [
      `${report.monthly_report_id}:${report.activity_id}`,
      normalizeCharacterStatus(report.status),
    ])
  )

  return sortCharacterActivities(activities).flatMap((activity) => {
    if (activity.level_code !== level) return []
    const statuses = kelompok.map((entry) => {
      const report = reportByKelompok.get(entry.id)
      return report
        ? (statusByCell.get(`${report.id}:${activity.id}`) ?? null)
        : null
    })
    const counts = CHARACTER_STATUS_CODES.flatMap((status) => {
      const count = statuses.filter((value) => value === status).length
      return count === 0
        ? []
        : [`${count} ${CHARACTER_STATUS_META[status].label}`]
    })
    return [{ activity, statuses, desa: counts.join(', ') || 'Belum' }]
  })
}

export function monitoringSensusTotal(
  level: CharacterLevelCode,
  masterSensus: SensusRow[],
  derivedSensus: Pick<
    SensusSnapshotRow,
    'kelompok_id' | 'category_code' | 'count'
  >[],
  kelompok: KelompokOption[]
) {
  const rows = level === 'GPN' ? derivedSensus : masterSensus
  const categoryCodes = new Set(level === 'GPN' ? ['GPN_A', 'GPN_B'] : [level])
  const kelompokIds = new Set(kelompok.map((entry) => entry.id))
  return rows.reduce(
    (total, snapshot) =>
      kelompokIds.has(snapshot.kelompok_id) &&
      categoryCodes.has(snapshot.category_code)
        ? total + snapshot.count
        : total,
    0
  )
}

export function formatTargetDetail(item: CharacterTargetItemRow) {
  const detail = item.detail_label?.trim() || '—'
  const references = [item.reference_from, item.reference_to]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' - ')
  return references ? `${detail} (${references})` : detail
}
