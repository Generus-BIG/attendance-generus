// Per-program slide renderer — kelompok mode (12-month trend) and desa mode (5-kelompok % comparison).
import {
  allMonthKeysForYear,
  monthNameFromKey,
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
      <div className='grid h-full grid-cols-2 gap-12 overflow-hidden'>
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
      <div className='grid h-full grid-cols-2 gap-12 overflow-hidden'>
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

export function renderProgramSlide(args: SlideArgs): Slide {
  return {
    key: `program-${args.program.code}`,
    title: args.program.name,
    render: () =>
      args.isSingleKelompok ? <ProgramKelompokBody {...args} /> : <ProgramDesaBody {...args} />,
  }
}
