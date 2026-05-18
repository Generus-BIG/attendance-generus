// Metrics slide renderers — table, kategori comparison (3/5 months), and 12-month aggregate.
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

// Kategori display + metric-code mapping
const KATEGORI_ORDER = ['ACR', 'APR', 'AR', 'GPN_A', 'GPN_B'] as const

const KATEGORI_LABELS: Record<string, string> = {
  ACR: 'ACR',
  APR: 'APR Intensif',
  AR: 'AR',
  GPN_A: 'GPN A (19-22)',
  GPN_B: 'GPN B (≥23)',
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
    yearlyMonthlyReports,
    yearlyMetricReports,
    slideNumber,
    totalSlides,
  } = args
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
      getMonthValue(kehadiranCode, mk, isSingleKelompok, kelompokFilter, lookups)
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
        title='Tabel Rata-rata Kehadiran'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <div className='h-full overflow-auto'>
          <EditorialTable>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>KATEGORI</EditorialTableHead>
                {SHORT_MONTH_LABELS.map((m) => (
                  <EditorialTableHead key={m} className='text-right'>
                    {m}
                  </EditorialTableHead>
                ))}
                <EditorialTableHead className='text-right'>
                  RATA²
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {rowsByKategori.map((g, gi) => {
                const isFirstGroup = gi === 0
                return [
                  <EditorialTableRow
                    key={`${g.kat}-keh`}
                    style={
                      !isFirstGroup
                        ? { borderTop: '1px solid #cbd5e1' }
                        : undefined
                    }
                  >
                    <EditorialTableCell>
                      <span className='font-semibold'>{g.kehadiranRow.label}</span>
                      <span className='ml-2 text-[9px] uppercase tracking-wider opacity-70'>
                        Kehadiran
                      </span>
                    </EditorialTableCell>
                    {g.kehadiranRow.monthly.map((v, i) => (
                      <EditorialTableCell
                        key={`keh-${i}`}
                        className='text-right tabular-nums'
                      >
                        {formatPct(v)}
                      </EditorialTableCell>
                    ))}
                    <EditorialTableCell className='text-right font-semibold tabular-nums'>
                      {formatPct(g.kehadiranRow.avg)}
                    </EditorialTableCell>
                  </EditorialTableRow>,
                  <EditorialTableRow key={`${g.kat}-piket`}>
                    <EditorialTableCell>
                      <span className='text-[9px] uppercase tracking-wider opacity-70'>
                        Piket LUPG
                      </span>
                    </EditorialTableCell>
                    {g.piketRow.monthly.map((v, i) => (
                      <EditorialTableCell
                        key={`piket-${i}`}
                        className='text-right tabular-nums'
                      >
                        {formatPct(v)}
                      </EditorialTableCell>
                    ))}
                    <EditorialTableCell className='text-right font-semibold tabular-nums'>
                      {formatPct(g.piketRow.avg)}
                    </EditorialTableCell>
                  </EditorialTableRow>,
                ]
              })}
              <TotalRow>
                <EditorialTableCell className='font-semibold uppercase'>
                  RATA² Kehadiran Generus
                </EditorialTableCell>
                {SHORT_MONTH_LABELS.map((_, i) => (
                  <EditorialTableCell
                    key={`g-${i}`}
                    className='text-right tabular-nums'
                  />
                ))}
                <EditorialTableCell className='text-right font-semibold tabular-nums'>
                  {formatPct(summaryGenerusAvg)}
                </EditorialTableCell>
              </TotalRow>
              <TotalRow>
                <EditorialTableCell className='font-semibold uppercase'>
                  RATA² Kehadiran Piket LUPG
                </EditorialTableCell>
                {SHORT_MONTH_LABELS.map((_, i) => (
                  <EditorialTableCell
                    key={`p-${i}`}
                    className='text-right tabular-nums'
                  />
                ))}
                <EditorialTableCell className='text-right font-semibold tabular-nums'>
                  {formatPct(summaryPiketAvg)}
                </EditorialTableCell>
              </TotalRow>
            </EditorialTableBody>
          </EditorialTable>
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
    scope,
    isSingleKelompok,
    kelompokFilter,
    kategoriCodes,
    monthsBack,
    titleSuffix,
    yearlyMonthlyReports,
    yearlyMetricReports,
    slideNumber,
    totalSlides,
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
      <SlideFrame
        eyebrow='METRIK KEHADIRAN'
        title={`Perbandingan ${monthsBack} Bulan Terakhir`}
        meta={`${monthLabel} · ${titleSuffix}`}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <div className={`grid h-full ${gridColsClass} gap-8`}>
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
        </div>
      </SlideFrame>
    ),
  }
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
    scope,
    isSingleKelompok,
    kelompokFilter,
    yearlyMonthlyReports,
    yearlyMetricReports,
    slideNumber,
    totalSlides,
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
      <SlideFrame
        eyebrow='METRIK KEHADIRAN'
        title='Rata-rata Generus vs Piket LUPG'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <div className='h-full'>
          <GenerusPiketAggregateBars
            monthLabels={monthLabels}
            generusValues={generusValues}
            piketValues={piketValues}
          />
        </div>
      </SlideFrame>
    ),
  }
}
