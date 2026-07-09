// Per-program slide renderer — kelompok mode (12-month trend) and desa mode (5-kelompok % comparison).
import {
  allMonthKeysForYear,
  monthNameFromKey,
  type Quarter,
  QUARTER_LABEL,
  getQuarterEndMonthKey,
} from '../../../programs/utils/editability'
import { parseNikahClusterExtras } from '../../../programs/types'
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
  prev: number | null
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
  return monthKeys
    .filter((mk) => mk <= currentMonthKey)
    .map((mk) => {
      const report = reportByMonth.get(mk)
      const row = report ? progByReport.get(report.id) : undefined
      const denom = row?.denominator ?? 0
      const now = row?.count_this_month ?? 0
      const pct = denom > 0 ? Math.round((now / denom) * 100) : null
      return {
        monthKey: mk,
        monthLabel: monthNameFromKey(mk),
        denom,
        now,
        pct,
      }
    })
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
    const prev = row?.count_prev_month ?? null
    const pct = denom > 0 ? Math.round((now / denom) * 100) : null
    return { kelompokId: k.id, kelompokName: k.value, denom, now, prev, pct }
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
      <div className='grid h-full grid-cols-[1.25fr_0.75fr] gap-12 overflow-hidden'>
        <DataPane>
          <EditorialTable headerVariant='hairline'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Bulan</EditorialTableHead>
                <EditorialTableHead className='text-right'>Sensus</EditorialTableHead>
                <EditorialTableHead className='text-right'>Jumlah</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {tableRows.map((r) => {
                const isCurrent = r.monthKey === monthKey
                return (
                  <EditorialTableRow
                    key={r.monthKey}
                    style={
                      isCurrent ? { background: p.cream } : undefined
                    }
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
          <TrendBar data={chartData} yAxisTitle='JUMLAH' />
        </ChartPane>
      </div>
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
      <div className='grid h-full grid-cols-[1.25fr_0.75fr] gap-12 overflow-hidden'>
        <DataPane>
          <EditorialTable headerVariant='hairline'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Kelompok</EditorialTableHead>
                <EditorialTableHead className='text-right'>Sensus</EditorialTableHead>
                <EditorialTableHead className='text-right'>Lalu</EditorialTableHead>
                <EditorialTableHead className='text-right'>Ini</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
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
                    {r.prev ?? '—'}
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
                <EditorialTableCell className='text-right'>—</EditorialTableCell>
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
            valueDomain={[0, 100]}
            valueFormatter={(n) => `${n}%`}
            labelFormatter={(n) => `${n}%`}
          />
        </ChartPane>
      </div>
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
  currentMonthKey: string
): SingleQuarterlyRow[] {
  const reportByMonth = new Map<string, MonthlyReportRow>()
  for (const r of yearlyMonthlyReports) {
    if (r.kelompok_id === kelompokId) reportByMonth.set(r.month.slice(0, 7), r)
  }
  const progByReport = new Map<string, ProgramReportRow>()
  for (const r of yearlyProgramReports) {
    if (r.program_code === programCode) progByReport.set(r.monthly_report_id, r)
  }

  const currentMonthIndex = parseInt(currentMonthKey.slice(5, 7), 10)
  const currentQuarter = Math.ceil(currentMonthIndex / 3)

  return quarters
    .filter((q) => q <= currentQuarter)
    .map((q) => {
      const endKey = getQuarterEndMonthKey(q, year)
      const report = reportByMonth.get(endKey)
      const row = report ? progByReport.get(report.id) : undefined
      const denom = row?.denominator ?? 0
      const now = row?.count_this_month ?? 0
      const pct = denom > 0 ? Math.round((now / denom) * 100) : null
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

function buildSingleKelompokQuarterlyChart(
  quarters: Quarter[],
  year: number,
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

  const currentMonthIndex = parseInt(currentMonthKey.slice(5, 7), 10)
  const currentQuarter = Math.ceil(currentMonthIndex / 3)

  return quarters.map((q) => {
    const endKey = getQuarterEndMonthKey(q, year)
    const report = reportByMonth.get(endKey)
    const row = report ? progByReport.get(report.id) : undefined
    return {
      label: `Q${q}`,
      value: row?.count_this_month ?? 0,
      isHighlighted: q === currentQuarter,
      isPlaceholder: q > currentQuarter,
    }
  })
}

function buildQuarterlyDesaRows(
  effectiveKelompokList: { id: string; value: string }[],
  programCode: string,
  programReports: ProgramReportRow[],
  yearlyMonthlyReports: MonthlyReportRow[],
  currentQuarterEndMonthKey: string,
  prevQuarterEndMonthKey: string | null
): { rows: DesaRow[]; totals: DesaTotalsRow } {
  const reportByKelompokCurrent = new Map<string, MonthlyReportRow>()
  const reportByKelompokPrev = new Map<string, MonthlyReportRow>()

  for (const r of yearlyMonthlyReports) {
    const mk = r.month.slice(0, 7)
    if (mk === currentQuarterEndMonthKey) {
      reportByKelompokCurrent.set(r.kelompok_id, r)
    } else if (prevQuarterEndMonthKey && mk === prevQuarterEndMonthKey) {
      reportByKelompokPrev.set(r.kelompok_id, r)
    }
  }

  const byReport = new Map<string, ProgramReportRow>()
  for (const r of programReports) {
    if (r.program_code === programCode) byReport.set(r.monthly_report_id, r)
  }

  const rows: DesaRow[] = effectiveKelompokList.map((k) => {
    const reportCurrent = reportByKelompokCurrent.get(k.id)
    const reportPrev = reportByKelompokPrev.get(k.id)

    const rowCurrent = reportCurrent ? byReport.get(reportCurrent.id) : undefined
    const rowPrev = reportPrev ? byReport.get(reportPrev.id) : undefined

    const denom = rowCurrent?.denominator ?? 0
    const now = rowCurrent?.count_this_month ?? 0
    const prev = rowPrev?.count_this_month ?? null
    const pct = denom > 0 ? Math.round((now / denom) * 100) : null

    return { kelompokId: k.id, kelompokName: k.value, denom, now, prev, pct }
  })

  const totalDenom = rows.reduce((a, b) => a + b.denom, 0)
  const totalNow = rows.reduce((a, b) => a + b.now, 0)
  const avgPct = totalDenom > 0 ? Math.round((totalNow / totalDenom) * 100) : null

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

  const tableRows = buildSingleKelompokQuarterlyRows(
    quarters,
    year,
    kelompokId,
    program.code,
    yearlyMonthlyReports,
    yearlyProgramReports,
    monthKey
  )
  const chartData = buildSingleKelompokQuarterlyChart(
    quarters,
    year,
    kelompokId,
    program.code,
    yearlyMonthlyReports,
    yearlyProgramReports,
    monthKey
  )

  const currentMonthIndex = parseInt(monthKey.slice(5, 7), 10)
  const currentQuarter = Math.ceil(currentMonthIndex / 3)

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title={program.name}
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <div className='grid h-full grid-cols-[1.25fr_0.75fr] gap-12 overflow-hidden'>
        <DataPane>
          <EditorialTable headerVariant='hairline'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Quarter</EditorialTableHead>
                <EditorialTableHead className='text-right'>Sensus</EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  {program.code === 'GMKM' ? 'Jumlah Kehadiran' : 'Jumlah'}
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
                <EditorialTableHead className='min-w-24 max-w-[20ch] whitespace-normal wrap-break-word'>
                  {program.code === 'GMKM' ? 'Keterangan' : 'Hasil Temuan'}
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {tableRows.map((r) => {
                const isCurrent = r.quarter === currentQuarter
                return (
                  <EditorialTableRow
                    key={r.quarter}
                    style={isCurrent ? { background: p.cream } : undefined}
                  >
                    <EditorialTableCell>{r.quarterLabel}</EditorialTableCell>
                    <EditorialTableCell className='text-right'>{r.denom}</EditorialTableCell>
                    <EditorialTableCell className='text-right'>{r.now}</EditorialTableCell>
                    <EditorialTableCell className='text-right font-semibold'>
                      {r.pct != null ? `${r.pct}%` : '—'}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-sm text-muted-foreground whitespace-normal wrap-break-word max-w-[20ch]'>
                      {r.notes || '—'}
                    </EditorialTableCell>
                  </EditorialTableRow>
                )
              })}
            </EditorialTableBody>
          </EditorialTable>
        </DataPane>
        <ChartPane>
          <TrendBar
            data={chartData}
            yAxisTitle={program.code === 'GMKM' ? 'KEHADIRAN' : 'JUMLAH'}
          />
        </ChartPane>
      </div>
    </SlideFrame>
  )
}

function ProgramQuarterlyDesaBody(props: SlideArgs) {
  const {
    program,
    monthKey,
    monthLabel,
    scope,
    effectiveKelompokList,
    programReports,
    yearlyMonthlyReports,
    slideNumber,
    totalSlides,
  } = props

  const year = parseInt(monthKey.slice(0, 4), 10)
  const currentMonthIndex = parseInt(monthKey.slice(5, 7), 10)
  const q = Math.ceil(currentMonthIndex / 3)

  const currentQuarterEndMonthKey = getQuarterEndMonthKey(q as Quarter, year)
  const prevQuarterEndMonthKey = q > 1 ? getQuarterEndMonthKey((q - 1) as Quarter, year) : null

  const { rows, totals } = buildQuarterlyDesaRows(
    effectiveKelompokList,
    program.code,
    programReports,
    yearlyMonthlyReports,
    currentQuarterEndMonthKey,
    prevQuarterEndMonthKey
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
      <div className='grid h-full grid-cols-[1.25fr_0.75fr] gap-12 overflow-hidden'>
        <DataPane>
          <EditorialTable headerVariant='hairline'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Kelompok</EditorialTableHead>
                <EditorialTableHead className='text-right'>Sensus</EditorialTableHead>
                <EditorialTableHead className='text-right'>Lalu</EditorialTableHead>
                <EditorialTableHead className='text-right'>Ini</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {rows.map((r) => (
                <EditorialTableRow key={r.kelompokId}>
                  <EditorialTableCell>{r.kelompokName}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>{r.denom}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>{r.prev ?? '—'}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>{r.now}</EditorialTableCell>
                  <EditorialTableCell className='text-right font-semibold'>
                    {r.pct != null ? `${r.pct}%` : '—'}
                  </EditorialTableCell>
                </EditorialTableRow>
              ))}
              <TotalRow>
                <EditorialTableCell>{totals.kelompokName}</EditorialTableCell>
                <EditorialTableCell className='text-right'>{totals.denom}</EditorialTableCell>
                <EditorialTableCell className='text-right'>—</EditorialTableCell>
                <EditorialTableCell className='text-right'>{totals.now}</EditorialTableCell>
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
            valueDomain={[0, 100]}
            valueFormatter={(n) => `${n}%`}
            labelFormatter={(n) => `${n}%`}
          />
        </ChartPane>
      </div>
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
  return monthKeys
    .filter((mk) => mk <= currentMonthKey)
    .map((mk) => {
      const report = reportByMonth.get(mk)
      const row = report ? progByReport.get(report.id) : undefined
      const denom = row?.denominator ?? 0
      const extras = parseNikahClusterExtras(row?.extras)
      const notReady = extras.not_ready
      const ready = extras.ready
      const married = row?.count_this_month ?? extras.married

      const pctOf = (val: number) =>
        denom > 0 ? Math.round((val / denom) * 100) : null

      return {
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
      }
    })
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
      <div className='h-full overflow-hidden flex flex-col gap-4'>
        <DataPane>
          <EditorialTable headerVariant='hairline' density='compact'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead rowSpan={2}>Bulan</EditorialTableHead>
                <EditorialTableHead rowSpan={2} className='text-right'>Sensus</EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>Belum Siap Menikah</EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>Siap Menikah</EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>Menikah</EditorialTableHead>
                <EditorialTableHead rowSpan={2} className='min-w-24 max-w-[20ch] whitespace-normal wrap-break-word'>Keterangan</EditorialTableHead>
              </EditorialTableRow>
              <EditorialTableRow>
                <EditorialTableHead className='text-right'>Jml</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
                <EditorialTableHead className='text-right'>Jml</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
                <EditorialTableHead className='text-right'>Jml</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
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
                    <EditorialTableCell className='text-right'>{r.denom}</EditorialTableCell>
                    <EditorialTableCell className='text-right'>{r.notReady}</EditorialTableCell>
                    <EditorialTableCell className='text-right text-muted-foreground font-semibold'>
                      {r.notReadyPct != null ? `${r.notReadyPct}%` : '—'}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>{r.ready}</EditorialTableCell>
                    <EditorialTableCell className='text-right text-muted-foreground font-semibold'>
                      {r.readyPct != null ? `${r.readyPct}%` : '—'}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>{r.married}</EditorialTableCell>
                    <EditorialTableCell className='text-right text-muted-foreground font-semibold'>
                      {r.marriedPct != null ? `${r.marriedPct}%` : '—'}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-sm text-muted-foreground whitespace-normal wrap-break-word max-w-[20ch]'>
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

  const avgNotReadyPct = totalDenom > 0 ? Math.round((totalNotReady / totalDenom) * 100) : null
  const avgReadyPct = totalDenom > 0 ? Math.round((totalReady / totalDenom) * 100) : null
  const avgMarriedPct = totalDenom > 0 ? Math.round((totalMarried / totalDenom) * 100) : null

  return (
    <SlideFrame
      eyebrow='PROGRAM PEMBINAAN'
      title='Progres Pernikahan Sesama Jamaah'
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <div className='h-full overflow-hidden flex flex-col gap-4'>
        <DataPane>
          <EditorialTable headerVariant='hairline' density='compact'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead rowSpan={2}>Kelompok</EditorialTableHead>
                <EditorialTableHead rowSpan={2} className='text-right'>Sensus</EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>Belum Siap Menikah</EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>Siap Menikah</EditorialTableHead>
                <EditorialTableHead colSpan={2} className='text-center'>Menikah</EditorialTableHead>
                <EditorialTableHead rowSpan={2} className='min-w-24 max-w-[20ch] whitespace-normal wrap-break-word'>Keterangan</EditorialTableHead>
              </EditorialTableRow>
              <EditorialTableRow>
                <EditorialTableHead className='text-right'>Jml</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
                <EditorialTableHead className='text-right'>Jml</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
                <EditorialTableHead className='text-right'>Jml</EditorialTableHead>
                <EditorialTableHead className='text-right'>%</EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {rows.map((r) => (
                <EditorialTableRow key={r.kelompokId}>
                  <EditorialTableCell>{r.kelompokName}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>{r.denom}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>{r.notReady}</EditorialTableCell>
                  <EditorialTableCell className='text-right text-muted-foreground font-semibold'>
                    {r.notReadyPct != null ? `${r.notReadyPct}%` : '—'}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right'>{r.ready}</EditorialTableCell>
                  <EditorialTableCell className='text-right text-muted-foreground font-semibold'>
                    {r.readyPct != null ? `${r.readyPct}%` : '—'}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right'>{r.married}</EditorialTableCell>
                  <EditorialTableCell className='text-right text-muted-foreground font-semibold'>
                    {r.marriedPct != null ? `${r.marriedPct}%` : '—'}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-sm text-muted-foreground whitespace-normal wrap-break-word max-w-[20ch]'>
                    {r.notes || '—'}
                  </EditorialTableCell>
                </EditorialTableRow>
              ))}
              <TotalRow>
                <EditorialTableCell>Total / Rata</EditorialTableCell>
                <EditorialTableCell className='text-right'>{totalDenom}</EditorialTableCell>
                <EditorialTableCell className='text-right'>{totalNotReady}</EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {avgNotReadyPct != null ? `${avgNotReadyPct}%` : '—'}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>{totalReady}</EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {avgReadyPct != null ? `${avgReadyPct}%` : '—'}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>{totalMarried}</EditorialTableCell>
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
