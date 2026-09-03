import { useState, type KeyboardEvent } from 'react'
import { BarChart2, Table as TableIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { parseNikahClusterExtras } from '../../../programs/types'
import {
  allMonthKeysForYear,
  monthNameFromKey,
  type Quarter,
  QUARTER_LABEL,
  getQuarterStartMonthKey,
} from '../../../programs/utils/editability'
import {
  type MonthlyReportRow,
  type ProgramDefinitionRow,
  type ProgramReportRow,
} from '../../../types'
import { TrendBar, type TrendBarDatum } from '../charts/trend-bar'
import { ChartPane } from '../components/chart-pane'
import { DataPane } from '../components/data-pane'
import {
  EditorialTable,
  EditorialTableBody,
  EditorialTableCell,
  EditorialTableHead,
  EditorialTableHeader,
  EditorialTableRow,
  TotalRow,
} from '../components/editorial-table'
import { ReportSplit } from '../components/report-split'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette } from '../use-pres-palette'

interface SingleRow {
  monthKey: string
  monthLabel: string
  denom: number
  now: number
  pct: number | null
}

interface DesaRow {
  kelompokId: string
  kelompokName: string
  denom: number
  now: number
  pct: number | null
}

interface DesaTotalsRow {
  kelompokName: string
  denom: number
  now: number
  pct: number | null
}

function buildSingleKelompokRows(
  monthKeys: string[],
  kelompokId: string,
  programCode: string,
  yearlyMonthlyReports: MonthlyReportRow[],
  yearlyProgramReports: ProgramReportRow[],
  currentMonthKey: string
): SingleRow[] {
  const reportByMonth = new Map<string, MonthlyReportRow>()
  for (const r of yearlyMonthlyReports) {
    if (r.kelompok_id === kelompokId) reportByMonth.set(r.month.slice(0, 7), r)
  }
  const progByReport = new Map<string, ProgramReportRow>()
  for (const r of yearlyProgramReports) {
    if (r.program_code === programCode) progByReport.set(r.monthly_report_id, r)
  }
  return monthKeys.reduce<SingleRow[]>((rows, mk) => {
    if (mk > currentMonthKey) return rows
    const report = reportByMonth.get(mk)
    const row = report ? progByReport.get(report.id) : undefined
    const denom = row?.denominator ?? 0
    const now = row?.count_this_month ?? 0
    const pct = denom > 0 ? Math.round((now / denom) * 100) : null
    rows.push({
      monthKey: mk,
      monthLabel: monthNameFromKey(mk),
      denom,
      now,
      pct,
    })
    return rows
  }, [])
}

function buildSingleKelompokChart(
  monthKeys: string[],
  kelompokId: string,
  programCode: string,
  yearlyMonthlyReports: MonthlyReportRow[],
  yearlyProgramReports: ProgramReportRow[],
  currentMonthKey: string
): TrendBarDatum[] {
  const reportByMonth = new Map<string, MonthlyReportRow>()
  for (const r of yearlyMonthlyReports) {
    if (r.kelompok_id === kelompokId) reportByMonth.set(r.month.slice(0, 7), r)
  }
  const progByReport = new Map<string, ProgramReportRow>()
  for (const r of yearlyProgramReports) {
    if (r.program_code === programCode) progByReport.set(r.monthly_report_id, r)
  }
  return monthKeys.map((mk) => {
    const report = reportByMonth.get(mk)
    const row = report ? progByReport.get(report.id) : undefined
    return {
      label: monthNameFromKey(mk).slice(0, 3),
      value: row?.count_this_month ?? 0,
      isHighlighted: mk === currentMonthKey,
      isPlaceholder: mk > currentMonthKey,
    }
  })
}

function buildDesaRows(
  effectiveKelompokList: { id: string; value: string }[],
  programCode: string,
  programReports: ProgramReportRow[],
  reportByKelompok: Map<string, MonthlyReportRow>
): { rows: DesaRow[]; totals: DesaTotalsRow } {
  const byReport = new Map<string, ProgramReportRow>()
  for (const r of programReports) {
    if (r.program_code === programCode) byReport.set(r.monthly_report_id, r)
  }
  const rows: DesaRow[] = effectiveKelompokList.map((k) => {
    const report = reportByKelompok.get(k.id)
    const row = report ? byReport.get(report.id) : undefined
    const denom = row?.denominator ?? 0
    const now = row?.count_this_month ?? 0
    const pct = denom > 0 ? Math.round((now / denom) * 100) : null
    return { kelompokId: k.id, kelompokName: k.value, denom, now, pct }
  })
  const totalDenom = rows.reduce((a, b) => a + b.denom, 0)
  const totalNow = rows.reduce((a, b) => a + b.now, 0)
  const avgPct =
    totalDenom > 0 ? Math.round((totalNow / totalDenom) * 100) : null
  return {
    rows,
    totals: {
      kelompokName: 'Total / Rata',
      denom: totalDenom,
      now: totalNow,
      pct: avgPct,
    },
  }
}

interface SlideArgs {
  program: ProgramDefinitionRow
  monthKey: string
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  kelompokFilter?: string
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  programReports: ProgramReportRow[]
  yearlyMonthlyReports: MonthlyReportRow[]
  yearlyProgramReports: ProgramReportRow[]
  slideNumber: number
  totalSlides: number
}

function ProgramKelompokBody(props: SlideArgs) {
  const p = usePresPalette()
  const {
    program,
    monthKey,
    monthLabel,
    scope,
    kelompokFilter,
    yearlyMonthlyReports,
    yearlyProgramReports,
    slideNumber,
    totalSlides,
  } = props
  const year = parseInt(monthKey.slice(0, 4), 10)
  const monthKeys = allMonthKeysForYear(year)
  const kelompokId = kelompokFilter ?? ''

  const tableRows = buildSingleKelompokRows(
    monthKeys,
    kelompokId,
    program.code,
    yearlyMonthlyReports,
    yearlyProgramReports,
    monthKey
  )
  const chartData = buildSingleKelompokChart(
    monthKeys,
    kelompokId,
    program.code,
    yearlyMonthlyReports,
    yearlyProgramReports,
    monthKey
  )

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title={program.name}
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <ReportSplit>
        <DataPane>
          <EditorialTable headerVariant='hairline'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Bulan</EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Sensus
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Jumlah
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {tableRows.map((r) => {
                const isCurrent = r.monthKey === monthKey
                return (
                  <EditorialTableRow
                    key={r.monthKey}
                    style={isCurrent ? { background: p.cream } : undefined}
                  >
                    <EditorialTableCell>{r.monthLabel}</EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.denom}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.now}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right font-semibold'>
                      {r.pct != null ? `${r.pct}%` : '—'}
                    </EditorialTableCell>
                  </EditorialTableRow>
                )
              })}
            </EditorialTableBody>
          </EditorialTable>
        </DataPane>
        <ChartPane>
          <TrendBar data={chartData} yAxisTitle='JUMLAH' valueLabel='Jumlah' />
        </ChartPane>
      </ReportSplit>
    </SlideFrame>
  )
}

function ProgramDesaBody(props: SlideArgs) {
  const {
    program,
    monthLabel,
    scope,
    effectiveKelompokList,
    reports,
    programReports,
    slideNumber,
    totalSlides,
  } = props

  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)

  const { rows, totals } = buildDesaRows(
    effectiveKelompokList,
    program.code,
    programReports,
    reportByKelompok
  )

  const chartData: TrendBarDatum[] = rows.map((r) => ({
    label: r.kelompokName,
    value: r.pct ?? 0,
  }))

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title={program.name}
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <ReportSplit>
        <DataPane>
          <EditorialTable headerVariant='hairline'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Kelompok</EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Sensus
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Jumlah
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {rows.map((r) => (
                <EditorialTableRow key={r.kelompokId}>
                  <EditorialTableCell>{r.kelompokName}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {r.denom}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {r.now}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right font-semibold'>
                    {r.pct != null ? `${r.pct}%` : '—'}
                  </EditorialTableCell>
                </EditorialTableRow>
              ))}
              <TotalRow>
                <EditorialTableCell>{totals.kelompokName}</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totals.denom}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totals.now}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totals.pct != null ? `${totals.pct}%` : '—'}
                </EditorialTableCell>
              </TotalRow>
            </EditorialTableBody>
          </EditorialTable>
        </DataPane>
        <ChartPane>
          <TrendBar
            data={chartData}
            yAxisTitle='%'
            valueLabel='Capaian vs Sensus'
            valueDomain={[0, 100]}
            valueFormatter={(n) => `${n}%`}
            labelFormatter={(n) => `${n}%`}
          />
        </ChartPane>
      </ReportSplit>
    </SlideFrame>
  )
}

// ================== Quarterly Programs Custom Components ==================

interface SingleQuarterlyRow {
  quarter: Quarter
  quarterLabel: string
  denom: number
  now: number
  pct: number | null
  notes: string
}

function buildSingleKelompokQuarterlyRows(
  quarters: Quarter[],
  year: number,
  kelompokId: string,
  programCode: string,
  yearlyMonthlyReports: MonthlyReportRow[],
  yearlyProgramReports: ProgramReportRow[],
  currentQuarter: number
): SingleQuarterlyRow[] {
  const reportByMonth = new Map<string, MonthlyReportRow>()
  for (const r of yearlyMonthlyReports) {
    if (r.kelompok_id === kelompokId) reportByMonth.set(r.month.slice(0, 7), r)
  }
  const progByReport = new Map<string, ProgramReportRow>()
  for (const r of yearlyProgramReports) {
    if (r.program_code === programCode) progByReport.set(r.monthly_report_id, r)
  }

  let latestSensus = 0
  for (const q of quarters) {
    const quarterKey = getQuarterStartMonthKey(q, year)
    const report = reportByMonth.get(quarterKey)
    const row = report ? progByReport.get(report.id) : undefined
    if (row?.denominator && row.denominator > 0) {
      latestSensus = row.denominator
    }
  }

  return quarters.map((q) => {
    const quarterKey = getQuarterStartMonthKey(q, year)
    const report = reportByMonth.get(quarterKey)
    const row = report ? progByReport.get(report.id) : undefined
    const isPastOrCurrent = q <= currentQuarter

    const denom =
      row?.denominator && row.denominator > 0
        ? row.denominator
        : isPastOrCurrent
          ? latestSensus
          : 0
    const now = row?.count_this_month ?? 0

    let pct: number | null = null
    if (isPastOrCurrent) {
      pct = denom > 0 ? Math.round((now / denom) * 100) : 0
    } else if (row && denom > 0) {
      pct = Math.round((now / denom) * 100)
    }

    return {
      quarter: q,
      quarterLabel: QUARTER_LABEL[q],
      denom,
      now,
      pct,
      notes: row?.notes ?? '',
    }
  })
}

interface QuarterlyDesaCell {
  denom: number
  now: number
  pct: number | null
}

interface QuarterlyDesaRow {
  kelompokId: string
  kelompokName: string
  sensus: number
  quarters: Record<Quarter, QuarterlyDesaCell>
  notes: string
  avgPct: number | null
}

interface QuarterlyDesaTotals {
  kelompokName: string
  sensus: number
  quarters: Record<Quarter, QuarterlyDesaCell>
  avgPct: number | null
}

function buildQuarterlyDesaMatrix(
  effectiveKelompokList: { id: string; value: string }[],
  programCode: string,
  yearlyProgramReports: ProgramReportRow[],
  yearlyMonthlyReports: MonthlyReportRow[],
  year: number,
  currentQuarter: number
): { rows: QuarterlyDesaRow[]; totals: QuarterlyDesaTotals } {
  const quarters: Quarter[] = [1, 2, 3, 4]

  const reportByKelompokMonth = new Map<string, MonthlyReportRow>()
  for (const r of yearlyMonthlyReports) {
    reportByKelompokMonth.set(`${r.kelompok_id}__${r.month.slice(0, 7)}`, r)
  }

  const progByReportAndCode = new Map<string, ProgramReportRow>()
  for (const r of yearlyProgramReports) {
    if (r.program_code === programCode) {
      progByReportAndCode.set(`${r.monthly_report_id}__${r.program_code}`, r)
    }
  }

  const rows: QuarterlyDesaRow[] = effectiveKelompokList.map((k) => {
    let latestSensus = 0
    let rowNotes = ''

    for (const q of quarters) {
      const quarterKey = getQuarterStartMonthKey(q, year)
      const report = reportByKelompokMonth.get(`${k.id}__${quarterKey}`)
      const row = report
        ? progByReportAndCode.get(`${report.id}__${programCode}`)
        : undefined

      if (row?.denominator && row.denominator > 0) {
        latestSensus = row.denominator
      }
      if (row?.notes) {
        rowNotes = row.notes
      }
    }

    const qMap = {} as Record<Quarter, QuarterlyDesaCell>
    const pctsForAvg: number[] = []

    for (const q of quarters) {
      const quarterKey = getQuarterStartMonthKey(q, year)
      const report = reportByKelompokMonth.get(`${k.id}__${quarterKey}`)
      const row = report
        ? progByReportAndCode.get(`${report.id}__${programCode}`)
        : undefined

      const isPastOrCurrent = q <= currentQuarter
      const denom =
        row?.denominator && row.denominator > 0
          ? row.denominator
          : isPastOrCurrent
            ? latestSensus
            : 0
      const now = row?.count_this_month ?? 0

      let pct: number | null = null
      if (isPastOrCurrent) {
        pct = denom > 0 ? Math.round((now / denom) * 100) : 0
        pctsForAvg.push(pct)
      } else if (row && denom > 0) {
        pct = Math.round((now / denom) * 100)
      }

      qMap[q] = { denom, now, pct }
    }

    const avgPct =
      pctsForAvg.length > 0
        ? Math.round(pctsForAvg.reduce((a, b) => a + b, 0) / pctsForAvg.length)
        : null

    return {
      kelompokId: k.id,
      kelompokName: k.value,
      sensus: latestSensus,
      quarters: qMap,
      notes: rowNotes,
      avgPct,
    }
  })

  const totalsQMap = {} as Record<Quarter, QuarterlyDesaCell>
  const totalDesaPcts: number[] = []

  for (const q of quarters) {
    const isPastOrCurrent = q <= currentQuarter
    const totalDenom = rows.reduce((acc, r) => acc + r.quarters[q].denom, 0)
    const totalNow = rows.reduce((acc, r) => acc + r.quarters[q].now, 0)

    let pct: number | null = null
    if (isPastOrCurrent) {
      pct = totalDenom > 0 ? Math.round((totalNow / totalDenom) * 100) : 0
      totalDesaPcts.push(pct)
    } else {
      const hasAnyReport = rows.some((r) => r.quarters[q].pct != null)
      if (hasAnyReport && totalDenom > 0) {
        pct = Math.round((totalNow / totalDenom) * 100)
      }
    }

    totalsQMap[q] = { denom: totalDenom, now: totalNow, pct }
  }

  const totalSensus = rows.reduce((acc, r) => acc + r.sensus, 0)
  const overallAvgPct =
    totalDesaPcts.length > 0
      ? Math.round(
          totalDesaPcts.reduce((a, b) => a + b, 0) / totalDesaPcts.length
        )
      : null

  return {
    rows,
    totals: {
      kelompokName: 'total/rata2',
      sensus: totalSensus,
      quarters: totalsQMap,
      avgPct: overallAvgPct,
    },
  }
}

function ProgramQuarterlyKelompokBody(props: SlideArgs) {
  const p = usePresPalette()
  const {
    program,
    monthKey,
    monthLabel,
    scope,
    kelompokFilter,
    yearlyMonthlyReports,
    yearlyProgramReports,
    slideNumber,
    totalSlides,
  } = props
  const year = parseInt(monthKey.slice(0, 4), 10)
  const quarters: Quarter[] = [1, 2, 3, 4]
  const kelompokId = kelompokFilter ?? ''

  const currentMonthIndex = parseInt(monthKey.slice(5, 7), 10)
  const currentQuarter = Math.ceil(currentMonthIndex / 3)

  const tableRows = buildSingleKelompokQuarterlyRows(
    quarters,
    year,
    kelompokId,
    program.code,
    yearlyMonthlyReports,
    yearlyProgramReports,
    currentQuarter
  )

  const isGmkm = program.code === 'GMKM'
  const headerBg = p.tableHeader
  const headerFg = p.tableHeaderFg

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title={isGmkm ? 'Laporan GMKM' : program.name}
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <div className='flex h-full min-h-0 flex-col justify-between'>
        <div
          className='w-full flex-1 min-h-0 overflow-hidden rounded-xl'
          style={{
            border: `1px solid ${p.rule}`,
          }}
        >
          <table
            className='h-full w-full table-fixed border-collapse tabular-nums'
            style={{
              fontFamily: p.fontSans,
              borderColor: p.rule,
            }}
          >
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '32%' }} />
            </colgroup>
            <thead>
              <tr style={{ height: '44px' }}>
                <th
                  className='px-4 text-left font-bold tracking-wider uppercase align-middle'
                  style={{
                    fontSize: 'clamp(0.82rem, 1cqw, 1.05rem)',
                    color: headerFg,
                    borderRight: `1px solid ${p.rule}`,
                    borderBottom: `1px solid ${p.rule}`,
                    background: headerBg,
                  }}
                >
                  Quarter
                </th>
                <th
                  className='px-3 text-center font-bold tracking-wider uppercase align-middle'
                  style={{
                    fontSize: 'clamp(0.8rem, 0.95cqw, 1rem)',
                    color: headerFg,
                    borderRight: `1px solid ${p.rule}`,
                    borderBottom: `1px solid ${p.rule}`,
                    background: headerBg,
                  }}
                >
                  {isGmkm ? 'Sensus Keputrian' : 'Sensus'}
                </th>
                <th
                  className='px-3 text-center font-bold tracking-wider uppercase align-middle'
                  style={{
                    fontSize: 'clamp(0.8rem, 0.95cqw, 1rem)',
                    color: headerFg,
                    borderRight: `1px solid ${p.rule}`,
                    borderBottom: `1px solid ${p.rule}`,
                    background: headerBg,
                  }}
                >
                  {isGmkm ? 'Hadir' : 'Jumlah'}
                </th>
                <th
                  className='px-3 text-center font-bold tracking-wider uppercase align-middle'
                  style={{
                    fontSize: 'clamp(0.8rem, 0.95cqw, 1rem)',
                    color: headerFg,
                    borderRight: `1px solid ${p.rule}`,
                    borderBottom: `1px solid ${p.rule}`,
                    background: headerBg,
                  }}
                >
                  %
                </th>
                <th
                  className='px-4 text-left font-bold tracking-wider uppercase align-middle'
                  style={{
                    fontSize: 'clamp(0.82rem, 1cqw, 1.05rem)',
                    color: headerFg,
                    borderBottom: `1px solid ${p.rule}`,
                    background: headerBg,
                  }}
                >
                  {isGmkm ? 'Keterangan' : 'Hasil Temuan'}
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, idx) => {
                const isFuture = r.quarter > currentQuarter
                const rowTitle = QUARTER_LABEL[r.quarter]
                const isLast = idx === tableRows.length - 1
                return (
                  <tr
                    key={r.quarter}
                    className='transition-colors hover:bg-muted/10'
                  >
                    <td
                      className='px-4 font-semibold align-middle'
                      style={{
                        fontSize: 'clamp(0.9rem, 1.1cqw, 1.18rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: isLast ? undefined : `1px solid ${p.rule}`,
                      }}
                    >
                      {rowTitle}
                    </td>
                    <td
                      className='px-3 text-center tabular-nums font-medium align-middle'
                      style={{
                        fontSize: 'clamp(0.9rem, 1.1cqw, 1.18rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: isLast ? undefined : `1px solid ${p.rule}`,
                      }}
                    >
                      {isFuture && r.denom === 0 ? (
                        <span className='text-muted-foreground'>—</span>
                      ) : (
                        r.denom
                      )}
                    </td>
                    <td
                      className='px-3 text-center tabular-nums font-medium align-middle'
                      style={{
                        fontSize: 'clamp(0.9rem, 1.1cqw, 1.18rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: isLast ? undefined : `1px solid ${p.rule}`,
                      }}
                    >
                      {isFuture && r.now === 0 ? (
                        <span className='text-muted-foreground'>—</span>
                      ) : (
                        r.now
                      )}
                    </td>
                    <td
                      className='px-3 text-center tabular-nums font-bold align-middle'
                      style={{
                        fontSize: 'clamp(0.95rem, 1.15cqw, 1.22rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: isLast ? undefined : `1px solid ${p.rule}`,
                      }}
                    >
                      {r.pct != null ? (
                        `${r.pct}%`
                      ) : (
                        <span className='font-normal text-muted-foreground'>
                          —
                        </span>
                      )}
                    </td>
                    <td
                      className='text-pretty px-4 py-2 align-middle text-muted-foreground'
                      style={{
                        fontSize: 'clamp(0.8rem, 0.95cqw, 1.02rem)',
                        lineHeight: 1.4,
                        borderBottom: isLast ? undefined : `1px solid ${p.rule}`,
                      }}
                    >
                      {r.notes || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SlideFrame>
  )
}

function ProgramQuarterlyDesaBody(props: SlideArgs) {
  const [view, setView] = useState<'data' | 'analysis'>('data')
  const p = usePresPalette()
  const {
    program,
    monthKey,
    monthLabel,
    scope,
    effectiveKelompokList,
    yearlyProgramReports,
    yearlyMonthlyReports,
    slideNumber,
    totalSlides,
  } = props

  const year = parseInt(monthKey.slice(0, 4), 10)
  const currentMonthIndex = parseInt(monthKey.slice(5, 7), 10)
  const currentQuarter = Math.ceil(currentMonthIndex / 3)
  const quarters: Quarter[] = [1, 2, 3, 4]
  const isGmkm = program.code === 'GMKM'

  const { rows, totals } = buildQuarterlyDesaMatrix(
    effectiveKelompokList,
    program.code,
    yearlyProgramReports,
    yearlyMonthlyReports,
    year,
    currentQuarter
  )

  const chartData: TrendBarDatum[] = quarters.map((q) => {
    const qPct = totals.quarters[q]?.pct ?? 0
    return {
      label: `Q${q}`,
      value: qPct,
      isHighlighted: q === currentQuarter,
      isPlaceholder: q > currentQuarter && totals.quarters[q]?.pct == null,
    }
  })

  const stopDeckKeys = (event: KeyboardEvent<HTMLDivElement>) =>
    event.stopPropagation()

  const metaNode = (
    <div className='flex items-center gap-3.5'>
      <span>{monthLabel}</span>
      <div onKeyDown={stopDeckKeys} className='flex items-center'>
        <ToggleGroup
          type='single'
          value={view}
          onValueChange={(val) => {
            if (val) setView(val as 'data' | 'analysis')
          }}
          variant='outline'
          size='sm'
          className='h-7 gap-0 rounded-lg border p-0.5'
          style={{
            borderColor: p.rule,
            background: 'transparent',
          }}
          aria-label='Tampilan laporan'
        >
          <ToggleGroupItem
            value='data'
            className='h-6 w-6 rounded-md p-0 data-[state=on]:bg-muted'
            style={{
              color: view === 'data' ? p.ink : p.muted,
            }}
            aria-label='Tampilkan tabel laporan'
          >
            <TableIcon className='h-3.5 w-3.5' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='analysis'
            className='h-6 w-6 rounded-md p-0 data-[state=on]:bg-muted'
            style={{
              color: view === 'analysis' ? p.ink : p.muted,
            }}
            aria-label='Tampilkan grafik laporan'
          >
            <BarChart2 className='h-3.5 w-3.5' />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )

  const headerBg = p.tableHeader
  const headerFg = p.tableHeaderFg
  const totalRowBg = `color-mix(in oklch, ${p.tableHeader} 14%, transparent)`

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title={isGmkm ? 'Laporan GMKM' : program.name}
      meta={metaNode}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      {view === 'data' ? (
        <div className='flex h-full min-h-0 flex-col justify-between'>
          <div
            className='w-full flex-1 min-h-0 overflow-hidden rounded-xl'
            style={{
              border: `1px solid ${p.rule}`,
            }}
          >
            <table
              className='h-full w-full table-fixed border-collapse tabular-nums'
              style={{
                fontFamily: p.fontSans,
                borderColor: p.rule,
              }}
            >
              <colgroup>
                {/* Kelompok */}
                <col style={{ width: '13%' }} />
                {/* Sensus Keputrian */}
                <col style={{ width: '12%' }} />
                {/* Q1 Hadir & % */}
                <col style={{ width: '6.5%' }} />
                <col style={{ width: '6.5%' }} />
                {/* Q2 Hadir & % */}
                <col style={{ width: '6.5%' }} />
                <col style={{ width: '6.5%' }} />
                {/* Q3 Hadir & % */}
                <col style={{ width: '6.5%' }} />
                <col style={{ width: '6.5%' }} />
                {/* Q4 Hadir & % */}
                <col style={{ width: '6.5%' }} />
                <col style={{ width: '6.5%' }} />
                {/* Keterangan */}
                <col style={{ width: '22%' }} />
              </colgroup>
              <thead>
                <tr style={{ height: '36px' }}>
                  <th
                    rowSpan={3}
                    className='px-3 text-left font-bold tracking-wider uppercase align-middle'
                    style={{
                      fontSize: 'clamp(0.82rem, 0.98cqw, 1.05rem)',
                      color: headerFg,
                      borderRight: `1px solid ${p.rule}`,
                      borderBottom: `1px solid ${p.rule}`,
                      background: headerBg,
                    }}
                  >
                    Kelompok
                  </th>
                  <th
                    rowSpan={3}
                    className='px-2 py-1 text-center font-bold tracking-wider uppercase align-middle leading-tight'
                    style={{
                      fontSize: 'clamp(0.76rem, 0.92cqw, 0.98rem)',
                      color: headerFg,
                      borderRight: `1px solid ${p.rule}`,
                      borderBottom: `1px solid ${p.rule}`,
                      background: headerBg,
                    }}
                  >
                    {isGmkm ? (
                      <div>
                        <div>SENSUS KEPUTRIAN</div>
                        <div
                          className='text-[10px] font-normal tracking-normal'
                          style={{
                            color:
                              'color-mix(in oklch, currentColor 75%, transparent)',
                          }}
                        >
                          (APR, AR, GPN)
                        </div>
                      </div>
                    ) : (
                      'SENSUS'
                    )}
                  </th>
                  <th
                    colSpan={8}
                    className='px-2 py-1 text-center font-bold tracking-wider uppercase align-middle'
                    style={{
                      fontSize: 'clamp(0.82rem, 0.98cqw, 1.05rem)',
                      color: headerFg,
                      borderRight: `1px solid ${p.rule}`,
                      borderBottom: `1px solid ${p.rule}`,
                      background: headerBg,
                    }}
                  >
                    {isGmkm
                      ? 'LAPORAN GMKM'
                      : `LAPORAN ${program.name.toUpperCase()}`}
                  </th>
                  <th
                    rowSpan={3}
                    className='px-3 py-1 text-left font-bold tracking-wider uppercase align-middle'
                    style={{
                      fontSize: 'clamp(0.82rem, 0.98cqw, 1.05rem)',
                      color: headerFg,
                      borderBottom: `1px solid ${p.rule}`,
                      background: headerBg,
                    }}
                  >
                    Keterangan
                  </th>
                </tr>
                <tr style={{ height: '30px' }}>
                  {quarters.map((q) => (
                    <th
                      key={q}
                      colSpan={2}
                      className='px-1 py-0.5 text-center font-bold uppercase align-middle'
                      style={{
                        fontSize: 'clamp(0.78rem, 0.92cqw, 0.98rem)',
                        color: headerFg,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                        background: headerBg,
                      }}
                    >
                      {`Q${q}`}
                    </th>
                  ))}
                </tr>
                <tr style={{ height: '26px' }}>
                  {quarters.flatMap((q) => [
                    <th
                      key={`h-hadir-${q}`}
                      className='px-1 py-0.5 text-center font-bold uppercase align-middle'
                      style={{
                        fontSize: 'clamp(0.68rem, 0.8cqw, 0.86rem)',
                        color: headerFg,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                        background: headerBg,
                      }}
                    >
                      Hadir
                    </th>,
                    <th
                      key={`h-pct-${q}`}
                      className='px-1 py-0.5 text-center font-bold uppercase align-middle'
                      style={{
                        fontSize: 'clamp(0.68rem, 0.8cqw, 0.86rem)',
                        color: headerFg,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                        background: headerBg,
                      }}
                    >
                      %
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.kelompokId}
                    className='transition-colors hover:bg-muted/10'
                  >
                    <td
                      className='px-3 font-semibold align-middle'
                      style={{
                        fontSize: 'clamp(0.88rem, 1.05cqw, 1.12rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                      }}
                    >
                      {r.kelompokName}
                    </td>
                    <td
                      className='px-2 text-center tabular-nums font-medium align-middle'
                      style={{
                        fontSize: 'clamp(0.85rem, 1.02cqw, 1.08rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                      }}
                    >
                      {r.sensus > 0 ? (
                        r.sensus
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </td>
                    {quarters.flatMap((q) => {
                      const isFutureQ = q > currentQuarter
                      const qData = r.quarters[q]
                      return [
                        <td
                          key={`hadir-${q}`}
                          className='px-1 text-center tabular-nums align-middle'
                          style={{
                            fontSize: 'clamp(0.85rem, 1.02cqw, 1.08rem)',
                            color: p.ink,
                            borderRight: `1px solid ${p.rule}`,
                            borderBottom: `1px solid ${p.rule}`,
                          }}
                        >
                          {isFutureQ && qData.pct == null ? (
                            <span className='text-muted-foreground'>—</span>
                          ) : (
                            qData.now
                          )}
                        </td>,
                        <td
                          key={`pct-${q}`}
                          className='px-1 text-center tabular-nums font-bold align-middle'
                          style={{
                            fontSize: 'clamp(0.88rem, 1.08cqw, 1.15rem)',
                            color: p.ink,
                            borderRight: `1px solid ${p.rule}`,
                            borderBottom: `1px solid ${p.rule}`,
                          }}
                        >
                          {isFutureQ && qData.pct == null ? (
                            <span className='font-normal text-muted-foreground'>
                              —
                            </span>
                          ) : (
                            `${qData.pct ?? 0}%`
                          )}
                        </td>,
                      ]
                    })}
                    <td
                      className='text-pretty px-3 py-1.5 align-middle text-muted-foreground'
                      style={{
                        fontSize: 'clamp(0.75rem, 0.9cqw, 0.95rem)',
                        lineHeight: 1.35,
                        borderBottom: `1px solid ${p.rule}`,
                      }}
                    >
                      {r.notes || '—'}
                    </td>
                  </tr>
                ))}
                <tr
                  className='font-bold'
                  style={{
                    background: totalRowBg,
                    borderTop: `2px solid ${p.rule}`,
                  }}
                >
                  <td
                    className='px-3 font-bold uppercase tracking-wide align-middle'
                    style={{
                      fontSize: 'clamp(0.88rem, 1.05cqw, 1.12rem)',
                      color: p.ink,
                      borderRight: `1px solid ${p.rule}`,
                    }}
                  >
                    {totals.kelompokName}
                  </td>
                  <td
                    className='px-2 text-center tabular-nums font-bold align-middle'
                    style={{
                      fontSize: 'clamp(0.88rem, 1.05cqw, 1.12rem)',
                      color: p.ink,
                      borderRight: `1px solid ${p.rule}`,
                    }}
                  >
                    {totals.sensus > 0 ? totals.sensus : '—'}
                  </td>
                  {quarters.flatMap((q) => {
                    const isFutureQ = q > currentQuarter
                    const qData = totals.quarters[q]
                    return [
                      <td
                        key={`total-hadir-${q}`}
                        className='px-1 text-center tabular-nums font-bold align-middle'
                        style={{
                          fontSize: 'clamp(0.88rem, 1.05cqw, 1.12rem)',
                          color: p.ink,
                          borderRight: `1px solid ${p.rule}`,
                        }}
                      >
                        {isFutureQ && qData.pct == null ? (
                          <span className='font-normal text-muted-foreground'>
                            —
                          </span>
                        ) : (
                          qData.now
                        )}
                      </td>,
                      <td
                        key={`total-pct-${q}`}
                        className='px-1 text-center tabular-nums font-bold align-middle'
                        style={{
                          fontSize: 'clamp(0.92rem, 1.12cqw, 1.18rem)',
                          color: p.ink,
                          borderRight: `1px solid ${p.rule}`,
                        }}
                      >
                        {isFutureQ && qData.pct == null ? (
                          <span className='font-normal text-muted-foreground'>
                            —
                          </span>
                        ) : (
                          `${qData.pct ?? 0}%`
                        )}
                      </td>,
                    ]
                  })}
                  <td
                    className='px-3 text-center align-middle text-muted-foreground'
                    style={{ fontSize: 'clamp(0.85rem, 1cqw, 1.05rem)' }}
                  >
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ReportSplit>
          <div className='flex h-full min-h-0 flex-col justify-between'>
            <div
              className='w-full flex-1 min-h-0 overflow-hidden rounded-xl'
              style={{
                border: `1px solid ${p.rule}`,
              }}
            >
              <table
                className='h-full w-full table-fixed border-collapse tabular-nums'
                style={{
                  fontFamily: p.fontSans,
                  borderColor: p.rule,
                }}
              >
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr style={{ height: '38px' }}>
                    <th
                      className='px-3 text-left font-bold tracking-wider uppercase align-middle'
                      style={{
                        fontSize: 'clamp(0.8rem, 0.95cqw, 1rem)',
                        color: headerFg,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                        background: headerBg,
                      }}
                    >
                      Kelompok
                    </th>
                    <th
                      className='px-2 text-center font-bold tracking-wider uppercase align-middle'
                      style={{
                        fontSize: 'clamp(0.78rem, 0.92cqw, 0.98rem)',
                        color: headerFg,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                        background: headerBg,
                      }}
                    >
                      Sensus
                    </th>
                    {quarters.map((q, idx) => (
                      <th
                        key={q}
                        className='px-1 text-center font-bold uppercase align-middle'
                        style={{
                          fontSize: 'clamp(0.78rem, 0.92cqw, 0.98rem)',
                          color: headerFg,
                          borderRight:
                            idx === quarters.length - 1
                              ? undefined
                              : `1px solid ${p.rule}`,
                          borderBottom: `1px solid ${p.rule}`,
                          background: headerBg,
                        }}
                      >
                        {`Q${q}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.kelompokId}
                      className='transition-colors hover:bg-muted/10'
                    >
                      <td
                        className='px-3 font-semibold align-middle'
                        style={{
                          fontSize: 'clamp(0.85rem, 1cqw, 1.05rem)',
                          color: p.ink,
                          borderRight: `1px solid ${p.rule}`,
                          borderBottom: `1px solid ${p.rule}`,
                        }}
                      >
                        {r.kelompokName}
                      </td>
                      <td
                        className='px-2 text-center tabular-nums font-medium align-middle'
                        style={{
                          fontSize: 'clamp(0.85rem, 1cqw, 1.05rem)',
                          color: p.ink,
                          borderRight: `1px solid ${p.rule}`,
                          borderBottom: `1px solid ${p.rule}`,
                        }}
                      >
                        {r.sensus > 0 ? (
                          r.sensus
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </td>
                      {quarters.map((q, idx) => {
                        const isFutureQ = q > currentQuarter
                        const qData = r.quarters[q]
                        return (
                          <td
                            key={q}
                            className='px-1 text-center font-medium tabular-nums align-middle'
                            style={{
                              fontSize: 'clamp(0.85rem, 1cqw, 1.05rem)',
                              color: p.ink,
                              borderRight:
                                idx === quarters.length - 1
                                  ? undefined
                                  : `1px solid ${p.rule}`,
                              borderBottom: `1px solid ${p.rule}`,
                            }}
                          >
                            {isFutureQ && qData.pct == null ? (
                              <span className='text-muted-foreground'>—</span>
                            ) : (
                              qData.now
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr
                    className='font-bold'
                    style={{
                      background: totalRowBg,
                      borderTop: `2px solid ${p.rule}`,
                    }}
                  >
                    <td
                      className='px-3 font-bold uppercase tracking-wide align-middle'
                      style={{
                        fontSize: 'clamp(0.85rem, 1cqw, 1.05rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                      }}
                    >
                      {totals.kelompokName}
                    </td>
                    <td
                      className='px-2 text-center tabular-nums font-bold align-middle'
                      style={{
                        fontSize: 'clamp(0.85rem, 1cqw, 1.05rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                      }}
                    >
                      {totals.sensus > 0 ? totals.sensus : '—'}
                    </td>
                    {quarters.map((q, idx) => {
                      const isFutureQ = q > currentQuarter
                      const qData = totals.quarters[q]
                      return (
                        <td
                          key={q}
                          className='px-1 text-center tabular-nums font-bold align-middle'
                          style={{
                            fontSize: 'clamp(0.85rem, 1cqw, 1.05rem)',
                            color: p.ink,
                            borderRight:
                              idx === quarters.length - 1
                                ? undefined
                                : `1px solid ${p.rule}`,
                          }}
                        >
                          {isFutureQ && qData.pct == null ? (
                            <span className='font-normal text-muted-foreground'>
                              —
                            </span>
                          ) : (
                            qData.now
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <ChartPane>
            <TrendBar
              data={chartData}
              yAxisTitle='%'
              valueLabel='Rata-rata Capaian'
              valueDomain={[0, 100]}
              valueFormatter={(n) => `${n}%`}
              labelFormatter={(n) => `${n}%`}
            />
          </ChartPane>
        </ReportSplit>
      )}
    </SlideFrame>
  )
}

// ================== Pernikahan Sesama Jamaah (NIKAH_JM) Custom Components ==================

interface NikahJmRow {
  monthKey: string
  monthLabel: string
  denom: number
  notReady: number
  notReadyPct: number | null
  ready: number
  readyPct: number | null
  married: number
  marriedPct: number | null
  notes: string
}

function buildNikahJmKelompokRows(
  monthKeys: string[],
  kelompokId: string,
  yearlyMonthlyReports: MonthlyReportRow[],
  yearlyProgramReports: ProgramReportRow[],
  currentMonthKey: string
): NikahJmRow[] {
  const reportByMonth = new Map<string, MonthlyReportRow>()
  for (const r of yearlyMonthlyReports) {
    if (r.kelompok_id === kelompokId) reportByMonth.set(r.month.slice(0, 7), r)
  }
  const progByReport = new Map<string, ProgramReportRow>()
  for (const r of yearlyProgramReports) {
    if (r.program_code === 'NIKAH_JM') progByReport.set(r.monthly_report_id, r)
  }
  return monthKeys.reduce<NikahJmRow[]>((rows, mk) => {
    if (mk > currentMonthKey) return rows
    const report = reportByMonth.get(mk)
    const row = report ? progByReport.get(report.id) : undefined
    const denom = row?.denominator ?? 0
    const extras = parseNikahClusterExtras(row?.extras)
    const notReady = extras.not_ready
    const ready = extras.ready
    const married = row?.count_this_month ?? extras.married

    const pctOf = (val: number) =>
      denom > 0 ? Math.round((val / denom) * 100) : null

    rows.push({
      monthKey: mk,
      monthLabel: monthNameFromKey(mk),
      denom,
      notReady,
      notReadyPct: pctOf(notReady),
      ready,
      readyPct: pctOf(ready),
      married,
      marriedPct: pctOf(married),
      notes: row?.notes ?? '',
    })
    return rows
  }, [])
}

function NikahJmKelompokBody(props: SlideArgs) {
  const p = usePresPalette()
  const {
    monthKey,
    monthLabel,
    scope,
    kelompokFilter,
    yearlyMonthlyReports,
    yearlyProgramReports,
    slideNumber,
    totalSlides,
  } = props
  const year = parseInt(monthKey.slice(0, 4), 10)
  const monthKeys = allMonthKeysForYear(year)
  const kelompokId = kelompokFilter ?? ''

  const tableRows = buildNikahJmKelompokRows(
    monthKeys,
    kelompokId,
    yearlyMonthlyReports,
    yearlyProgramReports,
    monthKey
  )

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title='Progres Pernikahan Sesama Jamaah'
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <div className='flex h-full flex-col gap-4 overflow-hidden'>
        <DataPane>
          <EditorialTable headerVariant='hairline' density='compact'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead rowSpan={2}>Bulan</EditorialTableHead>
                <EditorialTableHead rowSpan={2} className='text-right'>
                  Sensus
                </EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>
                  Belum Siap Menikah
                </EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>
                  Siap Menikah
                </EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>
                  Menikah
                </EditorialTableHead>
                <EditorialTableHead
                  rowSpan={2}
                  className='max-w-[20ch] min-w-24 wrap-break-word whitespace-normal'
                >
                  Keterangan
                </EditorialTableHead>
              </EditorialTableRow>
              <EditorialTableRow>
                <EditorialTableHead className='text-right'>
                  Jml
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Jml
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Jml
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {tableRows.map((r) => {
                const isCurrent = r.monthKey === monthKey
                return (
                  <EditorialTableRow
                    key={r.monthKey}
                    style={isCurrent ? { background: p.cream } : undefined}
                  >
                    <EditorialTableCell>{r.monthLabel}</EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.denom}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.notReady}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right font-semibold text-muted-foreground'>
                      {r.notReadyPct != null ? `${r.notReadyPct}%` : '—'}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.ready}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right font-semibold text-muted-foreground'>
                      {r.readyPct != null ? `${r.readyPct}%` : '—'}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.married}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right font-semibold text-muted-foreground'>
                      {r.marriedPct != null ? `${r.marriedPct}%` : '—'}
                    </EditorialTableCell>
                    <EditorialTableCell className='max-w-[20ch] text-sm wrap-break-word whitespace-normal text-muted-foreground'>
                      {r.notes || '—'}
                    </EditorialTableCell>
                  </EditorialTableRow>
                )
              })}
            </EditorialTableBody>
          </EditorialTable>
        </DataPane>
      </div>
    </SlideFrame>
  )
}

function NikahJmDesaBody(props: SlideArgs) {
  const {
    monthLabel,
    scope,
    effectiveKelompokList,
    reports,
    programReports,
    slideNumber,
    totalSlides,
  } = props

  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)

  const byReport = new Map<string, ProgramReportRow>()
  for (const r of programReports) {
    if (r.program_code === 'NIKAH_JM') byReport.set(r.monthly_report_id, r)
  }

  const rows = effectiveKelompokList.map((k) => {
    const report = reportByKelompok.get(k.id)
    const row = report ? byReport.get(report.id) : undefined
    const denom = row?.denominator ?? 0
    const extras = parseNikahClusterExtras(row?.extras)
    const notReady = extras.not_ready
    const ready = extras.ready
    const married = row?.count_this_month ?? extras.married

    const pctOf = (val: number) =>
      denom > 0 ? Math.round((val / denom) * 100) : null

    return {
      kelompokId: k.id,
      kelompokName: k.value,
      denom,
      notReady,
      notReadyPct: pctOf(notReady),
      ready,
      readyPct: pctOf(ready),
      married,
      marriedPct: pctOf(married),
      notes: row?.notes ?? '',
    }
  })

  const totalDenom = rows.reduce((a, b) => a + b.denom, 0)
  const totalNotReady = rows.reduce((a, b) => a + b.notReady, 0)
  const totalReady = rows.reduce((a, b) => a + b.ready, 0)
  const totalMarried = rows.reduce((a, b) => a + b.married, 0)

  const avgNotReadyPct =
    totalDenom > 0 ? Math.round((totalNotReady / totalDenom) * 100) : null
  const avgReadyPct =
    totalDenom > 0 ? Math.round((totalReady / totalDenom) * 100) : null
  const avgMarriedPct =
    totalDenom > 0 ? Math.round((totalMarried / totalDenom) * 100) : null

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title='Progres Pernikahan Sesama Jamaah'
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <div className='flex h-full flex-col gap-4 overflow-hidden'>
        <DataPane>
          <EditorialTable headerVariant='hairline' density='compact'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead rowSpan={2}>Kelompok</EditorialTableHead>
                <EditorialTableHead rowSpan={2} className='text-right'>
                  Sensus
                </EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>
                  Belum Siap Menikah
                </EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>
                  Siap Menikah
                </EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>
                  Menikah
                </EditorialTableHead>
                <EditorialTableHead
                  rowSpan={2}
                  className='max-w-[20ch] min-w-24 wrap-break-word whitespace-normal'
                >
                  Keterangan
                </EditorialTableHead>
              </EditorialTableRow>
              <EditorialTableRow>
                <EditorialTableHead className='text-right'>
                  Jml
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Jml
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Jml
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  %
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {rows.map((r) => (
                <EditorialTableRow key={r.kelompokId}>
                  <EditorialTableCell>{r.kelompokName}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {r.denom}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {r.notReady}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right font-semibold text-muted-foreground'>
                    {r.notReadyPct != null ? `${r.notReadyPct}%` : '—'}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {r.ready}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right font-semibold text-muted-foreground'>
                    {r.readyPct != null ? `${r.readyPct}%` : '—'}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {r.married}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right font-semibold text-muted-foreground'>
                    {r.marriedPct != null ? `${r.marriedPct}%` : '—'}
                  </EditorialTableCell>
                  <EditorialTableCell className='max-w-[20ch] text-sm wrap-break-word whitespace-normal text-muted-foreground'>
                    {r.notes || '—'}
                  </EditorialTableCell>
                </EditorialTableRow>
              ))}
              <TotalRow>
                <EditorialTableCell>Total / Rata</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalDenom}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalNotReady}
                </EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {avgNotReadyPct != null ? `${avgNotReadyPct}%` : '—'}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalReady}
                </EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {avgReadyPct != null ? `${avgReadyPct}%` : '—'}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalMarried}
                </EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {avgMarriedPct != null ? `${avgMarriedPct}%` : '—'}
                </EditorialTableCell>
                <EditorialTableCell>—</EditorialTableCell>
              </TotalRow>
            </EditorialTableBody>
          </EditorialTable>
        </DataPane>
      </div>
    </SlideFrame>
  )
}

// ================== Main Switcher ==================

export function renderProgramSlide(args: SlideArgs): Slide {
  const isQuarterly = args.program.reporting_style === 'quarterly'
  return {
    key: `program-${args.program.code}`,
    title: args.program.name,
    render: () => {
      if (args.program.code === 'NIKAH_JM') {
        return args.isSingleKelompok ? (
          <NikahJmKelompokBody {...args} />
        ) : (
          <NikahJmDesaBody {...args} />
        )
      }
      if (isQuarterly) {
        return args.isSingleKelompok ? (
          <ProgramQuarterlyKelompokBody {...args} />
        ) : (
          <ProgramQuarterlyDesaBody {...args} />
        )
      }
      return args.isSingleKelompok ? (
        <ProgramKelompokBody {...args} />
      ) : (
        <ProgramDesaBody {...args} />
      )
    },
  }
}
