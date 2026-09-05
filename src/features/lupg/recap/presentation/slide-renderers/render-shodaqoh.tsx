// Shodaqoh slide renderer — kelompok mode (12-month nominal trend) and desa mode (per-kelompok comparison).
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  allMonthKeysForYear,
  monthNameFromKey,
} from '../../../programs/utils/editability'
import { type MonthlyReportRow, type ShodaqohRow } from '../../../types'
import {
  EditorialTooltipShell,
  hairlineAxisProps,
} from '../charts/chart-primitives'
import { TrendBar, type TrendBarDatum } from '../charts/trend-bar'
import { ChartPane } from '../components/chart-pane'
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

function formatTrendLabel(n: number): string {
  return `${Math.round(n / 1_000)}k`
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

interface ShodaqohTrendProps {
  data: (TrendBarDatum & { showLabel: boolean })[]
}

interface TrendLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: number | string
  index?: number
  data: ShodaqohTrendProps['data']
  palette: ReturnType<typeof usePresPalette>
}

function TrendLabel({
  x,
  y,
  width,
  value,
  index,
  data,
  palette,
}: TrendLabelProps) {
  const amount = Number(value)
  const xNum = Number(x)
  const yNum = Number(y)
  const widthNum = Number(width)
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(xNum) ||
    !Number.isFinite(yNum) ||
    !Number.isFinite(widthNum) ||
    index == null ||
    !data[index]?.showLabel
  ) {
    return null
  }
  return (
    <text
      x={xNum + widthNum / 2}
      y={yNum - 12}
      textAnchor='middle'
      style={{
        fontFamily: palette.fontMono,
        fontSize: '10px',
        fontWeight: 600,
        fill: palette.ink,
      }}
    >
      {formatTrendLabel(amount)}
    </text>
  )
}

function ShodaqohTrend({ data }: ShodaqohTrendProps) {
  const p = usePresPalette()
  const yMax = 1_000_000
  const ticks = [0, 200_000, 400_000, 600_000, 800_000, yMax]

  return (
    <ResponsiveContainer width='100%' height='100%'>
      <AreaChart
        data={data}
        margin={{ top: 44, right: 24, bottom: 14, left: 24 }}
      >
        <defs>
          <linearGradient id='shodaqoh-trend-fill' x1='0' x2='0' y1='0' y2='1'>
            <stop
              offset='0%'
              stopColor={p.shodaqohPrimary}
              stopOpacity={0.22}
            />
            <stop
              offset='100%'
              stopColor={p.shodaqohPrimary}
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={p.rule} />
        <XAxis dataKey='label' interval={0} {...hairlineAxisProps(p, 'x')} />
        <YAxis
          width={72}
          domain={[0, yMax]}
          ticks={ticks}
          tickFormatter={formatRupiahShort}
          {...hairlineAxisProps(p, 'y')}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            const value = payload?.[0]?.value
            if (!active || typeof value !== 'number') return null
            return (
              <EditorialTooltipShell title={String(label ?? '')} palette={p}>
                <div>Nominal: {formatRupiahFull(value)}</div>
              </EditorialTooltipShell>
            )
          }}
        />
        <Area
          type='linear'
          dataKey='value'
          stroke={p.shodaqohPrimary}
          strokeWidth={2}
          fill='url(#shodaqoh-trend-fill)'
          dot={{
            r: 4,
            fill: p.bg,
            stroke: p.shodaqohPrimary,
            strokeWidth: 2.5,
          }}
          activeDot={{
            r: 5,
            fill: p.bg,
            stroke: p.shodaqohPrimary,
            strokeWidth: 3,
          }}
        >
          <LabelList
            dataKey='value'
            content={(props) => (
              <TrendLabel
                {...(props as Omit<TrendLabelProps, 'data' | 'palette'>)}
                data={data}
                palette={p}
              />
            )}
          />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  )
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
  // ponytail: chart stops at the report month like the table (no zeroed future months).
  const visibleRows = allRows.filter((r) => r.monthKey <= monthKey)
  const chartData = visibleRows.map((r, index) => {
    const previousValue = index > 0 ? visibleRows[index - 1].nominal : undefined
    return {
      label: monthNameFromKey(r.monthKey).slice(0, 3),
      value: r.nominal,
      isHighlighted: r.monthKey === monthKey,
      isPlaceholder: false,
      showLabel: r.nominal > 0 && r.nominal !== previousValue,
    }
  })

  return (
    <SlideFrame
      slideKey='shodaqoh'
      decorationKind='split'
      eyebrow='SHODAQOH PPG'
      title='Shodaqoh PPG'
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <div className='grid h-full min-h-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6'>
        <div className='flex h-full min-h-0 items-start pt-12'>
          <EditorialTable headerVariant='hairline' density='compact'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Bulan</EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Nominal (Rp)
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  KK
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Rata per KK
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {tableRows.map((r) => {
                const isCurrent = r.monthKey === monthKey
                return (
                  <EditorialTableRow
                    key={r.monthKey}
                    className={isCurrent ? 'font-semibold' : undefined}
                  >
                    <EditorialTableCell>{r.monthLabel}</EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {formatRupiahFull(r.nominal)}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {r.kk}
                    </EditorialTableCell>
                    <EditorialTableCell
                      className='text-right font-semibold'
                      style={
                        isCurrent ? { color: p.shodaqohPrimary } : undefined
                      }
                    >
                      {r.kk > 0 ? formatRupiahFull(r.rata) : '—'}
                    </EditorialTableCell>
                  </EditorialTableRow>
                )
              })}
            </EditorialTableBody>
          </EditorialTable>
        </div>
        <ChartPane>
          <ShodaqohTrend data={chartData} />
        </ChartPane>
      </div>
    </SlideFrame>
  )
}

function ShodaqohDesaBody(props: SlideArgs) {
  const p = usePresPalette()
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
      slideKey='shodaqoh'
      decorationKind='split'
      eyebrow='SHODAQOH PPG'
      title='Shodaqoh per Kelompok'
      meta={monthLabel}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <ReportSplit>
        <div className='flex h-full min-h-0 items-start pt-12'>
          <EditorialTable headerVariant='hairline' density='compact'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Kelompok</EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Nominal (Rp)
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  KK
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Rata per KK
                </EditorialTableHead>
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
        </div>
        <ChartPane>
          <TrendBar
            data={chartData}
            color={p.shodaqohPrimary}
            yAxisTitle='NOMINAL'
            valueLabel='Nominal'
            valueFormatter={formatRupiahShort}
            labelFormatter={formatRupiahShort}
          />
        </ChartPane>
      </ReportSplit>
    </SlideFrame>
  )
}

export function renderShodaqohSlide(args: SlideArgs): Slide {
  return {
    key: 'shodaqoh',
    title: 'Shodaqoh PPG',
    render: () =>
      args.isSingleKelompok ? (
        <ShodaqohKelompokBody {...args} />
      ) : (
        <ShodaqohDesaBody {...args} />
      ),
  }
}
