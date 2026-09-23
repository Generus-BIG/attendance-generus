import { shiftMonth } from '../../utils/month-utils'
import { type DesaOverviewData } from '../hooks/use-desa-overview'
import {
  aggregateAttendanceCategories,
  type AttendanceValue,
} from './attendance-aggregate'

type PublicPayload = {
  status: 'ok'
  share: {
    monthKey?: string
    initialMonthKey?: string
    selectedMonthKey?: string
    availableMonthKeys?: string[]
  }
  data: {
    kelompoks: Array<{ key: string; name: string }>
    reports: Array<{ kelompokKey: string; monthKey: string; status: string }>
    programs: Array<{ code: string; name: string }>
    programValues: Array<{
      kelompokKey: string
      monthKey: string
      code: string
      count: number | null
      denominator: number | null
    }>
    trendProgramValues?: Array<{
      monthKey: string
      code: string
      count: number | null
      denominator: number | null
    }>
    metricValues: Array<{
      kelompokKey: string
      monthKey: string
      code: string
      value: number | null
    }>
    sarprasItems: Array<{ index: number; name: string }>
    sarprasValues: Array<{
      kelompokKey: string
      monthKey: string
      itemIndex: number
      fulfilled: boolean
    }>
    shodaqohValues: Array<{
      kelompokKey: string
      monthKey: string
      nominal: number | null
    }>
    sensus: Array<{ category: string; count: number }>
    mustinNotes: Array<{
      kelompokKey: string
      monthKey: string
      pokokMasalah: string
      keputusanRencana: string
      status: string
      sortOrder: number
    }>
    documentation: Array<{
      kelompokKey: string
      monthKey: string
      caption: string | null
      signedUrl: string | null
    }>
  }
}

function weightedPercent(count: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((count / denominator) * 100) : null
}

function average(values: Array<number | null>): number | null {
  const defined = values.filter(
    (value): value is number => value != null && Number.isFinite(value)
  )
  return defined.length
    ? Math.round(
        defined.reduce((sum, value) => sum + value, 0) / defined.length
      )
    : null
}

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export type PublicAnalyticsResult = {
  data: DesaOverviewData
  initialMonthKey: string
  availableMonthKeys: string[]
}

export function mapPublicAnalyticsPayload(
  input: unknown
): PublicAnalyticsResult | null {
  if (!input || typeof input !== 'object') return null
  const payload = input as PublicPayload
  if (payload.status !== 'ok') return null

  const selectedMonthKey =
    payload.share?.selectedMonthKey ?? payload.share?.monthKey ?? ''
  const initialMonthKey =
    payload.share?.initialMonthKey ?? payload.share?.monthKey ?? ''
  const availableMonthKeys = Array.isArray(payload.share?.availableMonthKeys)
    ? payload.share.availableMonthKeys.filter((key) => MONTH_KEY_RE.test(key))
    : [selectedMonthKey]
  if (
    !MONTH_KEY_RE.test(selectedMonthKey) ||
    !MONTH_KEY_RE.test(initialMonthKey) ||
    availableMonthKeys.length === 0
  )
    return null

  const { data } = payload
  const monthKey = selectedMonthKey
  const year = Number(monthKey.slice(0, 4))
  const previousMonthKey = shiftMonth(monthKey, -1)
  const groups = data.kelompoks ?? []
  const validReports = (data.reports ?? []).filter(
    (report) => report.status === 'submitted'
  )
  const reportKeys = new Set(
    validReports.map((report) => `${report.kelompokKey}|${report.monthKey}`)
  )
  const programDefs = data.programs ?? []
  const monthlyProgramValues = (data.programValues ?? []).filter((row) =>
    reportKeys.has(`${row.kelompokKey}|${row.monthKey}`)
  )
  const groupedProgramValues = new Map<
    string,
    { count: number; denominator: number }
  >()
  for (const row of monthlyProgramValues) {
    if (row.count == null || row.denominator == null) continue
    const key = `${row.code}|${row.monthKey}`
    const total = groupedProgramValues.get(key) ?? { count: 0, denominator: 0 }
    total.count += row.count
    total.denominator += row.denominator
    groupedProgramValues.set(key, total)
  }
  const trendProgramValues = data.trendProgramValues ?? monthlyProgramValues
  const groupedTrendValues = new Map<
    string,
    { count: number; denominator: number }
  >()
  for (const row of trendProgramValues) {
    if (row.count == null || row.denominator == null) continue
    const key = `${row.code}|${row.monthKey}`
    const total = groupedTrendValues.get(key) ?? { count: 0, denominator: 0 }
    total.count += row.count
    total.denominator += row.denominator
    groupedTrendValues.set(key, total)
  }
  const trendRataDesa = Array.from({ length: 12 }, (_, index) => {
    const key = shiftMonth(monthKey, index - 11)
    return {
      monthKey: key,
      value: average(
        programDefs.map((program) => {
          const totals = groupedTrendValues.get(`${program.code}|${key}`)
          return totals
            ? weightedPercent(totals.count, totals.denominator)
            : null
        })
      ),
    }
  })
  const programTrendLines = programDefs.map((program) => ({
    code: program.code,
    name: program.name,
    monthly: trendRataDesa.map(({ monthKey: key }) => {
      const totals = groupedTrendValues.get(`${program.code}|${key}`)
      return totals ? weightedPercent(totals.count, totals.denominator) : null
    }),
  }))
  const programRanked = programDefs
    .map((program) => {
      const totals = groupedProgramValues.get(`${program.code}|${monthKey}`)
      return {
        code: program.code,
        name: program.name,
        pct: totals ? weightedPercent(totals.count, totals.denominator) : null,
      }
    })
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
  const programKelompokMatrix = programDefs.map((program) => ({
    code: program.code,
    name: program.name,
    byKelompok: Object.fromEntries(
      groups.map((group) => {
        const row = monthlyProgramValues.find(
          (value) =>
            value.code === program.code &&
            value.kelompokKey === group.key &&
            value.monthKey === monthKey
        )
        return [
          group.key,
          row?.count != null && row.denominator != null
            ? weightedPercent(row.count, row.denominator)
            : null,
        ]
      })
    ),
  }))

  const attendanceRows: AttendanceValue[] = (data.metricValues ?? [])
    .filter((row) => reportKeys.has(`${row.kelompokKey}|${row.monthKey}`))
    .map((row) => ({
      monthKey: row.monthKey,
      kelompokId: row.kelompokKey,
      code: row.code,
      value: row.value,
    }))
  const attendance = aggregateAttendanceCategories(
    attendanceRows,
    monthKey,
    previousMonthKey
  )
  const sarprasCompleteness = groups.map((group) => {
    const items = (data.sarprasItems ?? []).map(
      (item) =>
        (data.sarprasValues ?? []).find(
          (value) =>
            value.kelompokKey === group.key &&
            value.monthKey === monthKey &&
            value.itemIndex === item.index
        )?.fulfilled ?? false
    )
    return {
      kelompokId: group.key,
      kelompokName: group.name,
      items,
      okCount: items.filter(Boolean).length,
      total: items.length,
    }
  })
  const shodaqohPerKelompok = groups.map((group) => {
    const value = (data.shodaqohValues ?? []).find(
      (row) => row.kelompokKey === group.key && row.monthKey === monthKey
    )
    return {
      kelompokId: group.key,
      kelompokName: group.name,
      nominal: value?.nominal ?? null,
    }
  })
  const shodaqohTotal = shodaqohPerKelompok.reduce<number | null>(
    (total, row) => (row.nominal == null ? total : (total ?? 0) + row.nominal),
    null
  )
  const previousShodaqoh = (data.shodaqohValues ?? []).filter(
    (row) => row.monthKey === previousMonthKey && row.nominal != null
  )
  const previousTotal = previousShodaqoh.reduce(
    (sum, row) => sum + (row.nominal ?? 0),
    0
  )
  const deltaShodaqoh =
    shodaqohTotal != null && previousShodaqoh.length && previousTotal > 0
      ? Math.round(((shodaqohTotal - previousTotal) / previousTotal) * 100)
      : null
  const sensusByCategory = (data.sensus ?? [])
    .map(({ category, count }) => ({
      category,
      count,
      pct:
        (data.sensus ?? []).reduce((sum, row) => sum + row.count, 0) > 0
          ? Math.round(
              (count /
                (data.sensus ?? []).reduce((sum, row) => sum + row.count, 0)) *
                100
            )
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
  const desaAvg =
    trendRataDesa.find((point) => point.monthKey === monthKey)?.value ?? null
  const previousAvg = groupedProgramValues.size
    ? average(
        programDefs.map((program) => {
          const totals = groupedProgramValues.get(
            `${program.code}|${previousMonthKey}`
          )
          return totals
            ? weightedPercent(totals.count, totals.denominator)
            : null
        })
      )
    : null
  const sarprasOkCount = (data.sarprasItems ?? []).filter(
    (item) =>
      sarprasCompleteness.length > 0 &&
      sarprasCompleteness.every((group) => group.items[item.index - 1] === true)
  ).length

  return {
    data: {
      year,
      monthKey,
      kelompoks: groups.map((group) => ({ id: group.key, name: group.name })),
      summary: {
        desaAvg,
        sensusActive: (data.sensus ?? []).reduce(
          (sum, row) => sum + row.count,
          0
        ),
        kehadiranAvg: attendance.generus.average,
        programOkCount: programRanked.filter(
          (row) => row.pct != null && row.pct >= 80
        ).length,
        sarprasOkCount,
        shodaqohMtd: shodaqohTotal,
        deltaDesaAvg:
          desaAvg != null && previousAvg != null ? desaAvg - previousAvg : null,
        deltaSensus: null,
        deltaKehadiran:
          attendance.generus.average != null &&
          attendance.generus.previousAverage != null
            ? attendance.generus.average - attendance.generus.previousAverage
            : null,
        deltaShodaqoh,
      },
      trendRataDesa,
      sensusByCategory,
      attendance,
      mustinNotes: (data.mustinNotes ?? [])
        .filter(
          (row) =>
            row.monthKey === monthKey &&
            reportKeys.has(`${row.kelompokKey}|${row.monthKey}`)
        )
        .map((row, index) => ({
          id: `note-${index + 1}`,
          kelompokName:
            groups.find((group) => group.key === row.kelompokKey)?.name ??
            'Kelompok',
          pokokMasalah: row.pokokMasalah,
          keputusanRencana: row.keputusanRencana,
          sortOrder: row.sortOrder,
        })),
      documentation: (data.documentation ?? [])
        .filter(
          (row) =>
            row.monthKey === monthKey &&
            reportKeys.has(`${row.kelompokKey}|${row.monthKey}`)
        )
        .map((row, index) => ({
          id: `photo-${index + 1}`,
          kelompokName:
            groups.find((group) => group.key === row.kelompokKey)?.name ??
            'Kelompok',
          caption: row.caption,
          signedUrl: row.signedUrl,
        })),
      programRanked,
      programKelompokMatrix,
      sarprasCompleteness,
      shodaqohPerKelompok,
      programTrendLines,
    },
    initialMonthKey,
    availableMonthKeys,
  }
}
