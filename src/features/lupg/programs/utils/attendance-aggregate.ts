import { KEHADIRAN_STATUS_THRESHOLDS } from '../constants'

const CATEGORIES = [
  { code: 'ACR', name: 'ACR' },
  { code: 'APR', name: 'APR Intensif' },
  { code: 'AR', name: 'AR' },
  { code: 'GPN_A', name: 'GPN A (19–22 tahun)' },
  { code: 'GPN_B', name: 'GPN B (≥ 23 tahun)' },
] as const

export interface AttendanceValue {
  monthKey: string
  kelompokId: string
  code: string
  value: number | null
}

export interface AttendanceCategory {
  code: string
  name: string
  pct: number | null
  trend: 'up' | 'down' | 'flat' | 'none'
}

export interface AttendanceSeries {
  categories: AttendanceCategory[]
  average: number | null
  previousAverage: number | null
}

export interface AttendanceAggregate {
  generus: AttendanceSeries
  piket: AttendanceSeries
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter(
    (value): value is number => value != null && Number.isFinite(value)
  )
  return valid.length
    ? Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
    : null
}

export function attendanceBand(
  pct: number | null
): 'ok' | 'warn' | 'crit' | 'none' {
  if (pct == null) return 'none'
  if (pct >= KEHADIRAN_STATUS_THRESHOLDS.ok) return 'ok'
  if (pct >= KEHADIRAN_STATUS_THRESHOLDS.warn) return 'warn'
  return 'crit'
}

export function aggregateAttendanceCategories(
  rows: AttendanceValue[],
  monthKey: string,
  previousMonthKey: string
): AttendanceAggregate {
  function valueFor(code: string, key: string): number | null {
    return average(
      rows
        .filter((row) => row.monthKey === key && row.code === code)
        .map((row) => row.value)
    )
  }

  function series(prefix: string): AttendanceSeries {
    const categories = CATEGORIES.map(({ code, name }) => {
      const metricCode = `${prefix}${code}`
      const categoryName =
        prefix === 'ATT_PCT_PIKET_'
          ? code === 'APR'
            ? 'APR'
            : code === 'GPN_A'
              ? 'GPN A'
              : code === 'GPN_B'
                ? 'GPN B'
                : name
          : name
      const pct = valueFor(metricCode, monthKey)
      const previous = valueFor(metricCode, previousMonthKey)
      const trend: AttendanceCategory['trend'] =
        pct == null || previous == null
          ? 'none'
          : pct > previous
            ? 'up'
            : pct < previous
              ? 'down'
              : 'flat'
      return { code, name: categoryName, pct, trend }
    })
    return {
      categories,
      average: average(categories.map((category) => category.pct)),
      previousAverage: average(
        CATEGORIES.map(({ code }) =>
          valueFor(`${prefix}${code}`, previousMonthKey)
        )
      ),
    }
  }

  return {
    generus: series('ATT_PCT_'),
    piket: series('ATT_PCT_PIKET_'),
  }
}
