import { cn } from '@/lib/utils'
import {
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringReportRow,
  type MonthlyReportRow,
} from '../types'

export const CHARACTER_LEVELS = ['ACR', 'APR', 'AR', 'GPN'] as const
export type CharacterLevelCode = (typeof CHARACTER_LEVELS)[number]

export const CHARACTER_LEVEL_LABELS: Record<CharacterLevelCode, string> = {
  ACR: 'ACR',
  APR: 'APR',
  AR: 'AR',
  GPN: 'GPN',
}

export const CHARACTER_STATUS_CODES = [
  'needs_discussion',
  'needs_guidance',
  'not_observed',
  'in_progress',
  'established',
] as const

export type CharacterMonitoringStatus =
  (typeof CHARACTER_STATUS_CODES)[number]

export const CHARACTER_STATUS_META: Record<
  CharacterMonitoringStatus,
  { label: string; priority: number; className: string }
> = {
  needs_discussion: {
    label: 'Perlu Dimusyawarahkan',
    priority: 1,
    className:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
  },
  needs_guidance: {
    label: 'Perlu Pembinaan',
    priority: 2,
    className:
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
  },
  not_observed: {
    label: 'Belum Terpantau',
    priority: 3,
    className: 'border-border bg-muted text-muted-foreground',
  },
  in_progress: {
    label: 'Mulai Diterapkan',
    priority: 4,
    className:
      'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-300',
  },
  established: {
    label: 'Sudah Terbiasa',
    priority: 5,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
}

export function isCharacterMonitoringStatus(
  value: string
): value is CharacterMonitoringStatus {
  return CHARACTER_STATUS_CODES.includes(value as CharacterMonitoringStatus)
}

export function normalizeCharacterStatus(
  value: string | null | undefined
): CharacterMonitoringStatus {
  return value && isCharacterMonitoringStatus(value) ? value : 'not_observed'
}

export function statusBadgeClassName(
  status: CharacterMonitoringStatus,
  className?: string
) {
  return cn(
    'inline-flex min-h-7 items-center rounded-md border px-2 py-1 text-xs font-medium leading-tight',
    CHARACTER_STATUS_META[status].className,
    className
  )
}

export interface CharacterMonitoringJoinedRow {
  report: CharacterMonitoringReportRow
  activity: CharacterMonitoringActivityRow
  monthlyReport: MonthlyReportRow
  kelompokName: string
}

export function buildCharacterRowsByReport(
  rows: CharacterMonitoringReportRow[]
): Map<string, CharacterMonitoringReportRow[]> {
  const map = new Map<string, CharacterMonitoringReportRow[]>()
  for (const row of rows) {
    const existing = map.get(row.monthly_report_id) ?? []
    existing.push(row)
    map.set(row.monthly_report_id, existing)
  }
  return map
}

export function sortCharacterActivities<
  T extends Pick<
    CharacterMonitoringActivityRow,
    'level_code' | 'sort_order' | 'activity_label'
  >,
>(rows: T[]): T[] {
  const levelIndex = new Map(
    CHARACTER_LEVELS.map((level, index) => [level, index])
  )
  return [...rows].sort((a, b) => {
    const levelA = levelIndex.get(a.level_code as CharacterLevelCode) ?? 999
    const levelB = levelIndex.get(b.level_code as CharacterLevelCode) ?? 999
    if (levelA !== levelB) return levelA - levelB
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.activity_label.localeCompare(b.activity_label)
  })
}

export function sortCharacterAgendaRows(
  rows: CharacterMonitoringJoinedRow[]
): CharacterMonitoringJoinedRow[] {
  return [...rows].sort((a, b) => {
    const statusA = normalizeCharacterStatus(a.report.status)
    const statusB = normalizeCharacterStatus(b.report.status)
    const priorityDiff =
      CHARACTER_STATUS_META[statusA].priority -
      CHARACTER_STATUS_META[statusB].priority
    if (priorityDiff !== 0) return priorityDiff
    return a.kelompokName.localeCompare(b.kelompokName)
  })
}

export function countCharacterStatuses(
  rows: CharacterMonitoringReportRow[]
): Record<CharacterMonitoringStatus, number> {
  const counts = {
    needs_discussion: 0,
    needs_guidance: 0,
    not_observed: 0,
    in_progress: 0,
    established: 0,
  } satisfies Record<CharacterMonitoringStatus, number>

  for (const row of rows) {
    counts[normalizeCharacterStatus(row.status)] += 1
  }

  return counts
}
