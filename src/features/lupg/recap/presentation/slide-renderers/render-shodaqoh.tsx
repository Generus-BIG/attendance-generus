// Shodaqoh slide renderer — kelompok mode (12-month nominal trend) and desa mode (per-kelompok comparison).
import {
  allMonthKeysForYear,
  monthNameFromKey,
} from '../../../programs/utils/editability'
import {
  type MonthlyReportRow,
  type ShodaqohRow,
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

// ---------- Rupiah formatting ----------

function formatBucketed(n: number, divisor: number, suffix: string): string {
  const v = n / divisor
  const decimals = v < 10 ? 1 : 0
  const fixed = v.toFixed(decimals)
  // Indonesian decimal comma
  const localized = fixed.replace('.', ',')
  return `Rp ${localized}${suffix}`
}

function formatRupiahShort(n: number): string {
  if (!Number.isFinite(n)) return 'Rp 0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return formatBucketed(n, 1_000_000_000, 'M')
  if (abs >= 1_000_000) return formatBucketed(n, 1_000_000, 'jt')
  if (abs >= 1_000) return formatBucketed(n, 1_000, 'rb')
  return `Rp ${Math.round(n)}`
}

function formatRupiahFull(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

// ---------- Row shapes ----------

interface KelompokModeRow {
  monthKey: string
  monthLabel: string
  nominal: number
  kk: number
  rata: number
}

interface DesaModeRow {
  kelompokId: string
  kelompokName: string
  nominal: number
  kk: number
  rata: number
}

// ---------- Builders ----------

function buildKelompokRows(
  monthKeys: string[],
  kelompokId: string,
  yearlyMonthlyReports: MonthlyReportRow[],
  yearlyShodaqohRows: ShodaqohRow[]
): KelompokModeRow[] {
  const reportByMonth = new Map<string, MonthlyReportRow>()
  for (const r of yearlyMonthlyReports) {
    if (r.kelompok_id === kelompokId) reportByMonth.set(r.month.slice(0, 7), r)
  }
  const shodByReport = new Map<string, ShodaqohRow>()
  for (const s of yearlyShodaqohRows) {
    shodByReport.set(s.monthly_report_id, s)
  }
  return monthKeys.map((mk) => {
    const report = reportByMonth.get(mk)
    const shod = report ? shodByReport.get(report.id) : undefined
    const nominal = Number(shod?.nominal ?? 0)
    const kk = shod?.jumlah_kk ?? 0
    const rata = kk > 0 ? Math.round(nominal / kk) : 0
    return {
      monthKey: mk,
      monthLabel: monthNameFromKey(mk),
      nominal,
      kk,
      rata,
    }
  })
}

function buildDesaRows(
  effectiveKelompokList: { id: string; value: string }[],
  reports: MonthlyReportRow[],
  shodaqohRows: ShodaqohRow[]
): { rows: DesaModeRow[]; totalNominal: number; totalKK: number } {
  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)
  const shodByReport = new Map<string, ShodaqohRow>()
  for (const s of shodaqohRows) shodByReport.set(s.monthly_report_id, s)

  const rows: DesaModeRow[] = effectiveKelompokList.map((k) => {
    const report = reportByKelompok.get(k.id)
    const shod = report ? shodByReport.get(report.id) : undefined
    const nominal = Number(shod?.nominal ?? 0)
    const kk = shod?.jumlah_kk ?? 0
    const rata = kk > 0 ? Math.round(nominal / kk) : 0
    return {
      kelompokId: k.id,
      kelompokName: k.value,
      nominal,
      kk,
      rata,
    }
  })
  const totalNominal = rows.reduce((a, b) => a + b.nominal, 0)
  const totalKK = rows.reduce((a, b) => a + b.kk, 0)
  return { rows, totalNominal, totalKK }
}

// ---------- Args ----------

interface SlideArgs {
  monthKey: string
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  kelompokFilter?: string
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  shodaqohRows: ShodaqohRow[]
  yearlyMonthlyReports: MonthlyReportRow[]
  yearlyShodaqohRows: ShodaqohRow[]
  slideNumber: number
  totalSlides: number
}

// ---------- Mode renderers ----------

function ShodaqohKelompokBody(props: SlideArgs) {
  const p = usePresPalette()
  const {
    monthKey,
    monthLabel,
    scope,
    kelompokFilter,
    yearlyMonthlyReports,
    yearlyShodaqohRows,
    slideNumber,
    totalSlides,
  } = props
  const year = parseInt(monthKey.slice(0, 4), 10)
  const monthKeys = allMonthKeysForYear(year)
  const kelompokId = kelompokFilter ?? ''

  const allRows = buildKelompokRows(
    monthKeys,
    kelompokId,
    yearlyMonthlyReports,
    yearlyShodaqohRows
  )
  const tableRows = allRows.filter((r) => r.monthKey <= monthKey)
  const chartData: TrendBarDatum[] = allRows.map((r) => ({
    label: monthNameFromKey(r.monthKey).slice(0, 3),
    value: r.nominal,
    isHighlighted: r.monthKey === monthKey,
    isPlaceholder: r.monthKey > monthKey,
  }))

  return (
    <SlideFrame
      eyebrow='SHODAQOH PPG'
      title='Shodaqoh PPG'
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
                <EditorialTableHead className='text-right'>Nominal (Rp)</EditorialTableHead>
                <EditorialTableHead className='text-right'>KK</EditorialTableHead>
                <EditorialTableHead className='text-right'>Rata per KK</EditorialTableHead>
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
                      {formatRupiahFull(r.nominal)}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.kk}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right font-semibold'>
                      {r.kk > 0 ? formatRupiahFull(r.rata) : '—'}
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
            yAxisTitle='NOMINAL'
            valueFormatter={formatRupiahShort}
            labelFormatter={formatRupiahShort}
          />
        </ChartPane>
      </div>
    </SlideFrame>
  )
}

function ShodaqohDesaBody(props: SlideArgs) {
  const {
    monthLabel,
    scope,
    effectiveKelompokList,
    reports,
    shodaqohRows,
    slideNumber,
    totalSlides,
  } = props

  const { rows, totalNominal, totalKK } = buildDesaRows(
    effectiveKelompokList,
    reports,
    shodaqohRows
  )
  const totalRata = totalKK > 0 ? Math.round(totalNominal / totalKK) : 0

  const chartData: TrendBarDatum[] = rows.map((r) => ({
    label: r.kelompokName,
    value: r.nominal,
  }))

  return (
    <SlideFrame
      eyebrow='SHODAQOH PPG'
      title='Shodaqoh per Kelompok'
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
                <EditorialTableHead className='text-right'>Nominal (Rp)</EditorialTableHead>
                <EditorialTableHead className='text-right'>KK</EditorialTableHead>
                <EditorialTableHead className='text-right'>Rata per KK</EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {rows.map((r) => (
                <EditorialTableRow key={r.kelompokId}>
                  <EditorialTableCell>{r.kelompokName}</EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {formatRupiahFull(r.nominal)}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right'>
                    {r.kk}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-right font-semibold'>
                    {r.kk > 0 ? formatRupiahFull(r.rata) : '—'}
                  </EditorialTableCell>
                </EditorialTableRow>
              ))}
              <TotalRow>
                <EditorialTableCell>Total Desa</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {formatRupiahFull(totalNominal)}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalKK}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalKK > 0 ? formatRupiahFull(totalRata) : '—'}
                </EditorialTableCell>
              </TotalRow>
            </EditorialTableBody>
          </EditorialTable>
        </DataPane>
        <ChartPane>
          <TrendBar
            data={chartData}
            yAxisTitle='NOMINAL'
            valueFormatter={formatRupiahShort}
            labelFormatter={formatRupiahShort}
          />
        </ChartPane>
      </div>
    </SlideFrame>
  )
}

export function renderShodaqohSlide(args: SlideArgs): Slide {
  return {
    key: 'shodaqoh',
    title: 'Shodaqoh PPG',
    render: () =>
      args.isSingleKelompok ? <ShodaqohKelompokBody {...args} /> : <ShodaqohDesaBody {...args} />,
  }
}
