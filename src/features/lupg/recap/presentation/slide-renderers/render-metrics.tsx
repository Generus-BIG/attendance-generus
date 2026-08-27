// Metrics slide renderers — table, kategori comparison (3/5 months), and 12-month aggregate.
import { type ReactNode } from 'react'
import { addMonths, format, parse } from 'date-fns'
import {
  allMonthKeysForYear,
  monthNameFromKey,
} from '../../../programs/utils/editability'
import {
  type MetricDefinitionRow,
  type MetricReportRow,
  type MonthlyReportRow,
} from '../../../types'
import { GenerusPiketAggregateBars } from '../charts/generus-piket-aggregate-bars'
import { PairedMonthBars } from '../charts/paired-month-bars'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette } from '../use-pres-palette'

// Kategori display + metric-code mapping
const KATEGORI_ORDER = ['ACR', 'APR', 'AR', 'GPN_A', 'GPN_B'] as const
type KategoriCode = (typeof KATEGORI_ORDER)[number]

const KATEGORI_LABELS: Record<string, string> = {
  ACR: 'ACR',
  APR: 'APR Intensif',
  AR: 'AR',
  GPN_A: 'GPN A (19-22 tahun)',
  GPN_B: 'GPN B (23-30 tahun)',
}
const KATEGORI_TO_KEHADIRAN: Record<string, string> = {
  ACR: 'ATT_PCT_ACR',
  APR: 'ATT_PCT_APR',
  AR: 'ATT_PCT_AR',
  GPN_A: 'ATT_PCT_GPN_A',
  GPN_B: 'ATT_PCT_GPN_B',
}
const KATEGORI_TO_PIKET: Record<string, string> = {
  ACR: 'ATT_PCT_PIKET_ACR',
  APR: 'ATT_PCT_PIKET_APR',
  AR: 'ATT_PCT_PIKET_AR',
  GPN_A: 'ATT_PCT_PIKET_GPN_A',
  GPN_B: 'ATT_PCT_PIKET_GPN_B',
}

const SHORT_MONTH_LABELS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MEI',
  'JUN',
  'JUL',
  'AGT',
  'SEP',
  'OKT',
  'NOV',
  'DES',
] as const

interface ValueLookups {
  reportsByMonthAndKelompok: Map<string, Map<string, MonthlyReportRow>>
  metricByReport: Map<string, Map<string, MetricReportRow>>
}

function buildLookups(
  yearlyMonthlyReports: MonthlyReportRow[],
  yearlyMetricReports: MetricReportRow[]
): ValueLookups {
  const reportsByMonthAndKelompok = new Map<
    string,
    Map<string, MonthlyReportRow>
  >()
  for (const r of yearlyMonthlyReports) {
    const mk = r.month.slice(0, 7)
    let inner = reportsByMonthAndKelompok.get(mk)
    if (!inner) {
      inner = new Map()
      reportsByMonthAndKelompok.set(mk, inner)
    }
    inner.set(r.kelompok_id, r)
  }
  const metricByReport = new Map<string, Map<string, MetricReportRow>>()
  for (const mr of yearlyMetricReports) {
    let inner = metricByReport.get(mr.metric_code)
    if (!inner) {
      inner = new Map()
      metricByReport.set(mr.metric_code, inner)
    }
    inner.set(mr.monthly_report_id, mr)
  }
  return { reportsByMonthAndKelompok, metricByReport }
}

function getMonthValue(
  metricCode: string,
  monthKey: string,
  isSingleKelompok: boolean,
  kelompokFilter: string | undefined,
  lookups: ValueLookups
): number | null {
  const reportsForMonth = lookups.reportsByMonthAndKelompok.get(monthKey)
  if (!reportsForMonth || reportsForMonth.size === 0) return null
  const metricMap = lookups.metricByReport.get(metricCode)
  if (!metricMap) return null

  if (isSingleKelompok && kelompokFilter) {
    const report = reportsForMonth.get(kelompokFilter)
    if (!report) return null
    const mr = metricMap.get(report.id)
    if (!mr) return null
    const v = mr.current_value
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }

  // Desa mode: average non-null values across kelompok
  const values: number[] = []
  for (const report of reportsForMonth.values()) {
    const mr = metricMap.get(report.id)
    if (!mr) continue
    const v = mr.current_value
    if (typeof v === 'number' && Number.isFinite(v)) values.push(v)
  }
  if (values.length === 0) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

function avgOrNull(values: Array<number | null>): number | null {
  const valid = values.filter(
    (v): v is number => v != null && Number.isFinite(v)
  )
  if (valid.length === 0) return null
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
}

function formatPct(v: number | null): string {
  return v == null ? '—' : `${v}%`
}

function lastNMonthKeys(currentMonthKey: string, n: number): string[] {
  const start = addMonths(
    parse(`${currentMonthKey}-01`, 'yyyy-MM-dd', new Date()),
    -(n - 1)
  )
  return Array.from({ length: n }, (_, i) =>
    format(addMonths(start, i), 'yyyy-MM')
  )
}

function buildCurrentMetricMaps(
  reports: MonthlyReportRow[],
  metricReports: MetricReportRow[]
) {
  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const report of reports) reportByKelompok.set(report.kelompok_id, report)

  const metricByReport = new Map<string, Map<string, MetricReportRow>>()
  for (const metricReport of metricReports) {
    let inner = metricByReport.get(metricReport.metric_code)
    if (!inner) {
      inner = new Map()
      metricByReport.set(metricReport.metric_code, inner)
    }
    inner.set(metricReport.monthly_report_id, metricReport)
  }

  return { reportByKelompok, metricByReport }
}

function getKelompokCurrentValue(
  metricCode: string,
  kelompokId: string,
  maps: ReturnType<typeof buildCurrentMetricMaps>
): number | null {
  const report = maps.reportByKelompok.get(kelompokId)
  if (!report) return null
  const metric = maps.metricByReport.get(metricCode)?.get(report.id)
  const value = metric?.current_value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getKelompokCurrentAvg(
  metricCodes: string[],
  kelompokId: string,
  maps: ReturnType<typeof buildCurrentMetricMaps>
): number | null {
  return avgOrNull(
    metricCodes.map((code) => getKelompokCurrentValue(code, kelompokId, maps))
  )
}

interface DesaMetricTableRow {
  key: string
  label: string
  values: Array<number | null>
  desaAvg: number | null
  tone: 'category' | 'piket' | 'summary'
  startsGroup?: boolean
}

function MetricsDesaTable({
  kelompokList,
  reports,
  metricReports,
}: {
  kelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  metricReports: MetricReportRow[]
}) {
  const p = usePresPalette()
  const maps = buildCurrentMetricMaps(reports, metricReports)

  const isModern =
    typeof window !== 'undefined' &&
    document.documentElement.getAttribute('data-palette') === 'modern-natural'

  const colorCatBg = isModern
    ? '#ffffff'
    : `color-mix(in oklch, ${p.primary} 3%, ${p.bg})`
  const colorPiketBg = isModern
    ? '#ececf4'
    : `color-mix(in oklch, ${p.primary} 9%, ${p.bg})`
  const colorSummaryBg = isModern
    ? '#dae6f2'
    : `color-mix(in oklch, ${p.primary} 15%, ${p.bg})`
  const colorLabelSummaryBg = isModern
    ? '#d3cdca'
    : `color-mix(in oklch, ${p.primary} 20%, ${p.bg})`
  const colorDivider = isModern
    ? '#869fc3'
    : `color-mix(in oklch, ${p.primary} 35%, ${p.bg})`

  const colorTextCat = isModern ? '#0f172a' : p.ink
  const colorTextPiket = isModern
    ? '#2a2b77'
    : `color-mix(in oklch, ${p.primary} 85%, ${p.ink})`
  const colorTextSummary = isModern ? '#2a2b77' : p.brandAccent
  const colorFinalAvgBg = isModern ? '#2772b2' : p.primary

  const groups: Array<{
    key: KategoriCode
    attendanceRows: KategoriCode[]
    piketCodes: string[]
  }> = [
    {
      key: 'ACR',
      attendanceRows: ['ACR'],
      piketCodes: [KATEGORI_TO_PIKET.ACR],
    },
    {
      key: 'APR',
      attendanceRows: ['APR'],
      piketCodes: [KATEGORI_TO_PIKET.APR],
    },
    { key: 'AR', attendanceRows: ['AR'], piketCodes: [KATEGORI_TO_PIKET.AR] },
    {
      key: 'GPN_A',
      attendanceRows: ['GPN_A', 'GPN_B'],
      piketCodes: [KATEGORI_TO_PIKET.GPN_A, KATEGORI_TO_PIKET.GPN_B],
    },
  ]

  const rows: DesaMetricTableRow[] = []
  for (const group of groups) {
    group.attendanceRows.forEach((kat, index) => {
      const values = kelompokList.map((k) =>
        getKelompokCurrentValue(KATEGORI_TO_KEHADIRAN[kat], k.id, maps)
      )
      rows.push({
        key: `${kat}-attendance`,
        label: KATEGORI_LABELS[kat],
        values,
        desaAvg: avgOrNull(values),
        tone: 'category',
        startsGroup: index === 0,
      })
    })

    const piketValues = kelompokList.map((k) =>
      getKelompokCurrentAvg(group.piketCodes, k.id, maps)
    )
    rows.push({
      key: `${group.key}-piket`,
      label:
        group.key === 'GPN_A'
          ? 'Piket LUPG GPN'
          : `Piket LUPG ${KATEGORI_LABELS[group.key].replace(' Intensif', '')}`,
      values: piketValues,
      desaAvg: avgOrNull(piketValues),
      tone: 'piket',
    })
  }

  const summaryGenerus = kelompokList.map((k) =>
    avgOrNull(
      KATEGORI_ORDER.map((kat) =>
        getKelompokCurrentValue(KATEGORI_TO_KEHADIRAN[kat], k.id, maps)
      )
    )
  )
  const summaryPiket = kelompokList.map((k) =>
    avgOrNull(
      KATEGORI_ORDER.map((kat) =>
        getKelompokCurrentValue(KATEGORI_TO_PIKET[kat], k.id, maps)
      )
    )
  )

  rows.push({
    key: 'summary-generus',
    label: 'RATA² KEHADIRAN GENERUS',
    values: summaryGenerus,
    desaAvg: avgOrNull(summaryGenerus),
    tone: 'summary',
    startsGroup: true,
  })
  rows.push({
    key: 'summary-piket',
    label: 'RATA² KEHADIRAN LUPG',
    values: summaryPiket,
    desaAvg: avgOrNull(summaryPiket),
    tone: 'summary',
  })

  const headerStyle = {
    background: p.tableHeader,
    color: p.tableHeaderFg,
    fontFamily: p.fontMono,
    fontSize: 'clamp(0.65rem, 0.8cqw, 0.85rem)',
    fontWeight: 700,
    letterSpacing: '0.05em',
    lineHeight: 1.2,
    textTransform: 'uppercase' as const,
  }

  return (
    <div className='h-full overflow-hidden'>
      <table
        className='h-full w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-lg border tabular-nums'
        style={{ borderColor: p.rule }}
      >
        <thead>
          <tr>
            <th
              rowSpan={2}
              className='w-[18%] px-2 py-2 text-left'
              style={headerStyle}
            >
              KATEGORI
            </th>
            <th
              colSpan={kelompokList.length}
              className='px-2 py-1.5 text-center'
              style={headerStyle}
            >
              RATA-RATA KEHADIRAN SEBULAN %
            </th>
            <th
              rowSpan={2}
              className='w-[12%] px-2 py-2 text-center'
              style={headerStyle}
            >
              RATA² SE-DESA %
            </th>
          </tr>
          <tr>
            {kelompokList.map((k) => (
              <th
                key={k.id}
                className='px-2 py-1.5 text-center'
                style={headerStyle}
              >
                {k.value.replace(/^kel\.?\s*/i, '').toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowBg =
              row.tone === 'summary'
                ? colorSummaryBg
                : row.tone === 'piket'
                  ? colorPiketBg
                  : colorCatBg
            return (
              <tr
                key={row.key}
                style={{
                  background: rowBg,
                  borderTop:
                    row.startsGroup && row.key !== 'ACR-attendance'
                      ? `2px solid ${colorDivider}`
                      : undefined,
                  color:
                    row.tone === 'category'
                      ? colorTextCat
                      : row.tone === 'summary'
                        ? colorTextSummary
                        : colorTextPiket,
                  fontSize: 'clamp(0.62rem, 0.82vw, 0.96rem)',
                  fontWeight: row.tone === 'summary' ? 800 : 600,
                  lineHeight: 1.18,
                }}
              >
                <td
                  className='border-b px-2 py-2'
                  style={{
                    background:
                      row.tone === 'summary' ? colorLabelSummaryBg : undefined,
                    borderColor: p.rule,
                    fontWeight: 700,
                  }}
                >
                  {row.label}
                </td>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.key}-${kelompokList[index]?.id ?? index}`}
                    className='border-b px-2 py-2 text-center'
                    style={{ borderColor: p.rule }}
                  >
                    {formatPct(value)}
                  </td>
                ))}
                <td
                  className='border-b px-2 py-2 text-center'
                  style={
                    row.tone === 'summary'
                      ? {
                          background: colorFinalAvgBg,
                          borderColor: p.rule,
                          color: p.primaryFg,
                          fontWeight: 800,
                        }
                      : {
                          borderColor: p.rule,
                          fontWeight: 700,
                        }
                  }
                >
                  {formatPct(row.desaAvg)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Kelompok Metric Table Component ----------

interface KelompokMetricTableRow {
  key: string
  label: string
  values: Array<number | null>
  avg: number | null
  tone: 'category' | 'piket' | 'summary'
  startsGroup?: boolean
}

function MetricsKelompokTable({
  monthKeys,
  rowsByKategori,
  summaryGenerusAvg,
  summaryPiketAvg,
}: {
  monthKeys: string[]
  rowsByKategori: Array<{
    kat: KategoriCode
    kehadiranRow: {
      label: string
      monthly: Array<number | null>
      avg: number | null
    }
    piketRow: {
      label: string
      monthly: Array<number | null>
      avg: number | null
    }
  }>
  summaryGenerusAvg: number | null
  summaryPiketAvg: number | null
}) {
  const p = usePresPalette()

  const isModern =
    typeof window !== 'undefined' &&
    document.documentElement.getAttribute('data-palette') === 'modern-natural'

  const colorCatBg = isModern
    ? '#ffffff'
    : `color-mix(in oklch, ${p.primary} 3%, ${p.bg})`
  const colorPiketBg = isModern
    ? '#ececf4'
    : `color-mix(in oklch, ${p.primary} 9%, ${p.bg})`
  const colorSummaryBg = isModern
    ? '#dae6f2'
    : `color-mix(in oklch, ${p.primary} 15%, ${p.bg})`
  const colorLabelSummaryBg = isModern
    ? '#d3cdca'
    : `color-mix(in oklch, ${p.primary} 20%, ${p.bg})`
  const colorDivider = isModern
    ? '#869fc3'
    : `color-mix(in oklch, ${p.primary} 35%, ${p.bg})`

  const colorTextCat = isModern ? '#0f172a' : p.ink
  const colorTextPiket = isModern
    ? '#2a2b77'
    : `color-mix(in oklch, ${p.primary} 85%, ${p.ink})`
  const colorTextSummary = isModern ? '#2a2b77' : p.brandAccent
  const colorFinalAvgBg = isModern ? '#2772b2' : p.primary

  const rows: KelompokMetricTableRow[] = []
  rowsByKategori.forEach((g, gi) => {
    rows.push({
      key: `${g.kat}-kehadiran`,
      label: g.kehadiranRow.label,
      values: g.kehadiranRow.monthly,
      avg: g.kehadiranRow.avg,
      tone: 'category',
      startsGroup: gi > 0,
    })
    rows.push({
      key: `${g.kat}-piket`,
      label: `Piket LUPG ${g.kehadiranRow.label.replace(' Intensif', '')}`,
      values: g.piketRow.monthly,
      avg: g.piketRow.avg,
      tone: 'piket',
    })
  })

  const monthlyGenerusAvg = monthKeys.map((_, i) =>
    avgOrNull(rowsByKategori.map((g) => g.kehadiranRow.monthly[i]))
  )
  const monthlyPiketAvg = monthKeys.map((_, i) =>
    avgOrNull(rowsByKategori.map((g) => g.piketRow.monthly[i]))
  )

  rows.push({
    key: 'summary-generus',
    label: 'RATA² KEHADIRAN GENERUS',
    values: monthlyGenerusAvg,
    avg: summaryGenerusAvg,
    tone: 'summary',
    startsGroup: true,
  })
  rows.push({
    key: 'summary-piket',
    label: 'RATA² KEHADIRAN LUPG',
    values: monthlyPiketAvg,
    avg: summaryPiketAvg,
    tone: 'summary',
  })

  const headerStyle = {
    background: p.tableHeader,
    color: p.tableHeaderFg,
    fontFamily: p.fontMono,
    fontSize: 'clamp(0.65rem, 0.8cqw, 0.85rem)',
    fontWeight: 700,
    letterSpacing: '0.05em',
    lineHeight: 1.2,
    textTransform: 'uppercase' as const,
  }

  return (
    <div className='h-full overflow-hidden'>
      <table
        className='h-full w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-lg border tabular-nums'
        style={{ borderColor: p.rule }}
      >
        <thead>
          <tr>
            <th className='w-[18%] px-2 py-2 text-left' style={headerStyle}>
              KATEGORI
            </th>
            {SHORT_MONTH_LABELS.map((m) => (
              <th key={m} className='px-1 py-2 text-center' style={headerStyle}>
                {m}
              </th>
            ))}
            <th className='w-[10%] px-2 py-2 text-center' style={headerStyle}>
              RATA²
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowBg =
              row.tone === 'summary'
                ? colorSummaryBg
                : row.tone === 'piket'
                  ? colorPiketBg
                  : colorCatBg
            return (
              <tr
                key={row.key}
                style={{
                  background: rowBg,
                  borderTop:
                    row.startsGroup && row.key !== 'summary-generus'
                      ? `2px solid ${colorDivider}`
                      : row.key === 'summary-generus'
                        ? `2px solid ${colorDivider}`
                        : undefined,
                  color:
                    row.tone === 'category'
                      ? colorTextCat
                      : row.tone === 'summary'
                        ? colorTextSummary
                        : colorTextPiket,
                  fontSize: 'clamp(0.62rem, 0.82vw, 0.96rem)',
                  fontWeight: row.tone === 'summary' ? 800 : 600,
                  lineHeight: 1.18,
                }}
              >
                <td
                  className='border-b px-2 py-2'
                  style={{
                    background:
                      row.tone === 'summary' ? colorLabelSummaryBg : undefined,
                    borderColor: p.rule,
                    fontWeight: 700,
                  }}
                >
                  {row.label}
                </td>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.key}-${monthKeys[index]}`}
                    className='border-b px-1 py-2 text-center'
                    style={{ borderColor: p.rule }}
                  >
                    {formatPct(value)}
                  </td>
                ))}
                <td
                  className='border-b px-2 py-2 text-center'
                  style={
                    row.tone === 'summary'
                      ? {
                          background: colorFinalAvgBg,
                          borderColor: p.rule,
                          color: p.primaryFg,
                          fontWeight: 800,
                        }
                      : {
                          borderColor: p.rule,
                          fontWeight: 700,
                        }
                  }
                >
                  {formatPct(row.avg)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Metrics Table Slide ----------

interface RenderMetricsTableArgs {
  monthKey: string
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  kelompokFilter?: string
  effectiveKelompokList: { id: string; value: string }[]
  metrics: MetricDefinitionRow[]
  reports: MonthlyReportRow[]
  metricReports: MetricReportRow[]
  yearlyMonthlyReports: MonthlyReportRow[]
  yearlyMetricReports: MetricReportRow[]
  slideNumber: number
  totalSlides: number
}

export function renderMetricsTableSlide(args: RenderMetricsTableArgs): Slide {
  const {
    monthKey,
    monthLabel,
    scope,
    isSingleKelompok,
    kelompokFilter,
    effectiveKelompokList,
    reports,
    metricReports,
    yearlyMonthlyReports,
    yearlyMetricReports,
    slideNumber,
    totalSlides,
  } = args

  if (!isSingleKelompok) {
    return {
      key: 'metrics-table',
      title: 'Metrik Kehadiran · Tabel',
      render: () => (
        <SlideFrame
          eyebrow='METRIK KEHADIRAN'
          title='Persentase Kehadiran Perkelompok'
          meta={monthLabel}
          scope={scope}
          slideNumber={slideNumber}
          totalSlides={totalSlides}
        >
          <MetricsDesaTable
            kelompokList={effectiveKelompokList}
            reports={reports}
            metricReports={metricReports}
          />
        </SlideFrame>
      ),
    }
  }

  const year = parseInt(monthKey.slice(0, 4), 10)
  const monthKeys = allMonthKeysForYear(year)
  const lookups = buildLookups(yearlyMonthlyReports, yearlyMetricReports)

  // Build per-row data: for each kategori, kehadiran row + piket row (12 monthly values + RATA²)
  interface MetricRow {
    label: string
    seriesLabel: 'Kehadiran' | 'Piket LUPG'
    monthly: Array<number | null>
    avg: number | null
  }

  const rowsByKategori = KATEGORI_ORDER.map((kat) => {
    const kehadiranCode = KATEGORI_TO_KEHADIRAN[kat]
    const piketCode = KATEGORI_TO_PIKET[kat]
    const kehadiranMonthly = monthKeys.map((mk) =>
      getMonthValue(
        kehadiranCode,
        mk,
        isSingleKelompok,
        kelompokFilter,
        lookups
      )
    )
    const piketMonthly = monthKeys.map((mk) =>
      getMonthValue(piketCode, mk, isSingleKelompok, kelompokFilter, lookups)
    )
    const kehadiranRow: MetricRow = {
      label: KATEGORI_LABELS[kat],
      seriesLabel: 'Kehadiran',
      monthly: kehadiranMonthly,
      avg: avgOrNull(kehadiranMonthly),
    }
    const piketRow: MetricRow = {
      label: KATEGORI_LABELS[kat],
      seriesLabel: 'Piket LUPG',
      monthly: piketMonthly,
      avg: avgOrNull(piketMonthly),
    }
    return { kat, kehadiranRow, piketRow }
  })

  // Summary rows: avg of the 5 RATA² values for kehadiran / piket
  const summaryGenerusAvg = avgOrNull(
    rowsByKategori.map((g) => g.kehadiranRow.avg)
  )
  const summaryPiketAvg = avgOrNull(rowsByKategori.map((g) => g.piketRow.avg))

  return {
    key: 'metrics-table',
    title: 'Metrik Kehadiran · Tabel',
    render: () => (
      <SlideFrame
        eyebrow='METRIK KEHADIRAN'
        title='Persentase Kehadiran Generus'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <div className='h-full overflow-auto'>
          <MetricsKelompokTable
            monthKeys={monthKeys}
            rowsByKategori={rowsByKategori}
            summaryGenerusAvg={summaryGenerusAvg}
            summaryPiketAvg={summaryPiketAvg}
          />
        </div>
      </SlideFrame>
    ),
  }
}

// ---------- Metrics Compare Slide (3 or 5 months) ----------

interface RenderMetricsCompareArgs {
  monthKey: string
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  kelompokFilter?: string
  kategoriCodes: readonly string[]
  monthsBack: number
  titleSuffix: string
  metrics: MetricDefinitionRow[]
  yearlyMonthlyReports: MonthlyReportRow[]
  yearlyMetricReports: MetricReportRow[]
  slideNumber: number
  totalSlides: number
}

export function renderMetricsCompareSlide(
  args: RenderMetricsCompareArgs
): Slide {
  const {
    monthKey,
    monthLabel,
    scope: _scope,
    isSingleKelompok,
    kelompokFilter,
    kategoriCodes,
    monthsBack,
    titleSuffix,
    yearlyMonthlyReports,
    yearlyMetricReports,
    slideNumber: _slideNumber,
    totalSlides: _totalSlides,
  } = args

  const lookups = buildLookups(yearlyMonthlyReports, yearlyMetricReports)
  const monthKeys = lastNMonthKeys(monthKey, monthsBack)
  const monthLabels = monthKeys.map((mk) =>
    monthNameFromKey(mk).slice(0, 3).toUpperCase()
  )

  const cols = kategoriCodes.length
  const gridColsClass =
    cols === 2
      ? 'grid-cols-2'
      : cols === 3
        ? 'grid-cols-3'
        : cols === 4
          ? 'grid-cols-4'
          : 'grid-cols-5'

  return {
    key: `metrics-compare-${kategoriCodes.join('-')}`,
    title: `Metrik · ${titleSuffix}`,
    render: () => (
      <AttendanceComparisonSlide
        monthLabel={monthLabel}
        titleSuffix={titleSuffix}
        gridColsClass={gridColsClass}
      >
        {kategoriCodes.map((kat) => {
          const kehadiranCode = KATEGORI_TO_KEHADIRAN[kat]
          const piketCode = KATEGORI_TO_PIKET[kat]
          const kehadiran = monthKeys.map((mk) =>
            getMonthValue(
              kehadiranCode,
              mk,
              isSingleKelompok,
              kelompokFilter,
              lookups
            )
          )
          const piket = monthKeys.map((mk) =>
            getMonthValue(
              piketCode,
              mk,
              isSingleKelompok,
              kelompokFilter,
              lookups
            )
          )
          return (
            <PairedMonthBars
              key={kat}
              title={KATEGORI_LABELS[kat] ?? kat}
              monthLabels={monthLabels}
              kehadiran={kehadiran}
              piket={piket}
            />
          )
        })}
      </AttendanceComparisonSlide>
    ),
  }
}

function AttendanceComparisonSlide({
  monthLabel,
  titleSuffix,
  gridColsClass,
  children,
}: {
  monthLabel: string
  titleSuffix: string
  gridColsClass: string
  children: ReactNode
}) {
  const palette = usePresPalette()
  return (
    <div
      className='flex h-full flex-col overflow-hidden p-[clamp(2.5rem,5cqw,5rem)]'
      style={{
        background: palette.bg,
        color: palette.ink,
        fontFamily: palette.fontSans,
      }}
    >
      <header className='flex shrink-0 items-start justify-between gap-8'>
        <h1
          style={{
            fontFamily: palette.fontSans,
            fontSize: 'clamp(2.5rem, 4.2cqw, 5rem)',
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: '-0.045em',
          }}
        >
          Grafik Kehadiran | {titleSuffix.split(' · ').join(', ')}
        </h1>
        <time
          className='shrink-0 pt-2'
          style={{
            fontSize: 'clamp(1rem, 1.25cqw, 1.5rem)',
            color: palette.muted,
          }}
        >
          {monthLabel}
        </time>
      </header>
      <div
        className={`mt-[clamp(2rem,4cqh,4rem)] grid min-h-0 flex-1 ${gridColsClass} gap-6`}
      >
        {children}
      </div>
    </div>
  )
}

// ---------- Metrics Aggregate Slide ----------

interface RenderMetricsAggregateArgs {
  monthKey: string
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  kelompokFilter?: string
  metrics: MetricDefinitionRow[]
  yearlyMonthlyReports: MonthlyReportRow[]
  yearlyMetricReports: MetricReportRow[]
  slideNumber: number
  totalSlides: number
}

export function renderMetricsAggregateSlide(
  args: RenderMetricsAggregateArgs
): Slide {
  const {
    monthKey,
    monthLabel,
    scope: _scope,
    isSingleKelompok,
    kelompokFilter,
    yearlyMonthlyReports,
    yearlyMetricReports,
    slideNumber: _slideNumber,
    totalSlides: _totalSlides,
  } = args

  const year = parseInt(monthKey.slice(0, 4), 10)
  const monthKeys = allMonthKeysForYear(year)
  const monthLabels = monthKeys.map((mk) =>
    monthNameFromKey(mk).slice(0, 3).toUpperCase()
  )
  const lookups = buildLookups(yearlyMonthlyReports, yearlyMetricReports)

  const generusValues = monthKeys.map((mk) => {
    const perKat = KATEGORI_ORDER.map((kat) =>
      getMonthValue(
        KATEGORI_TO_KEHADIRAN[kat],
        mk,
        isSingleKelompok,
        kelompokFilter,
        lookups
      )
    )
    return avgOrNull(perKat)
  })

  const piketValues = monthKeys.map((mk) => {
    const perKat = KATEGORI_ORDER.map((kat) =>
      getMonthValue(
        KATEGORI_TO_PIKET[kat],
        mk,
        isSingleKelompok,
        kelompokFilter,
        lookups
      )
    )
    return avgOrNull(perKat)
  })

  return {
    key: 'metrics-aggregate',
    title: 'Rata-rata Kehadiran Generus vs Piket LUPG',
    render: () => (
      <AttendanceComparisonSlide
        monthLabel={monthLabel}
        titleSuffix='Generus Desa'
        gridColsClass='grid-cols-1'
      >
        <GenerusPiketAggregateBars
          monthLabels={monthLabels}
          generusValues={generusValues}
          piketValues={piketValues}
        />
      </AttendanceComparisonSlide>
    ),
  }
}
