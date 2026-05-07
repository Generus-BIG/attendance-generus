import { type ProgramReportRow } from '../../types'

export type ProgramSummary = {
  currentPct: number | null
  prevPct: number | null
  countCurrent: number | null
  denomCurrent: number | null
}

export function programSummary(params: {
  currentMonthKey: string
  reportByMonthKey: Map<string, { id: string }>
  programRowByReportId: Map<string, ProgramReportRow>
}): ProgramSummary {
  const { currentMonthKey, reportByMonthKey, programRowByReportId } = params

  const monthToPct = (mk: string): {
    pct: number | null
    count: number | null
    denom: number | null
  } => {
    const report = reportByMonthKey.get(mk)
    if (!report) return { pct: null, count: null, denom: null }
    const row = programRowByReportId.get(report.id)
    if (!row) return { pct: null, count: null, denom: null }
    const count = row.count_this_month ?? 0
    const denom = row.denominator ?? 0
    if (denom <= 0) return { pct: null, count, denom }
    return { pct: Math.round((count / denom) * 100), count, denom }
  }

  const prevMonthKey = shiftMonthKey(currentMonthKey, -1)
  const current = monthToPct(currentMonthKey)
  const prev = monthToPct(prevMonthKey)

  return {
    currentPct: current.pct,
    prevPct: prev.pct,
    countCurrent: current.count,
    denomCurrent: current.denom,
  }
}

function shiftMonthKey(mk: string, delta: number): string {
  const [y, m] = mk.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}
