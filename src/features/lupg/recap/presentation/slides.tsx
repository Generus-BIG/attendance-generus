import { type ReactNode } from 'react'
import {
  HighlightedBar,
  type BarDatum,
} from '@/components/charts/highlighted-bar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  MUSTIN_STATUS_LABELS,
} from '../../constants'
import {
  allMonthKeysForYear,
  monthNameFromKey,
} from '../../programs/utils/editability'
import {
  type MetricDefinitionRow,
  type MetricReportRow,
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinStatus,
  type ProgramDefinitionRow,
  type ProgramReportRow,
  type SarprasItemRow,
  type SarprasReportRow,
  type SensusSnapshotRow,
  type ShodaqohRow,
} from '../../types'
import { formatMonthLabel } from '../../utils/month-utils'

export interface Kelompok {
  id: string
  value: string
}

export interface PresentationData {
  monthKey: string
  kelompokList: Kelompok[]
  reports: MonthlyReportRow[]
  programs: ProgramDefinitionRow[]
  metrics: MetricDefinitionRow[]
  sarprasItems: SarprasItemRow[]
  sensusSnapshots: SensusSnapshotRow[]
  programReports: ProgramReportRow[]
  metricReports: MetricReportRow[]
  sarprasReports: SarprasReportRow[]
  shodaqohRows: ShodaqohRow[]
  mustinRows: MustinNoteRow[]
  // R3 additions:
  kelompokFilter?: string
  yearlyMonthlyReports?: MonthlyReportRow[]
  yearlyProgramReports?: ProgramReportRow[]
}

export interface Slide {
  key: string
  title: string
  render: () => ReactNode
}

interface DesaRow {
  kelompokId: string
  kelompokName: string
  denom: number
  now: number
  prev: number | null
  pct: number | null
}

interface SingleRow {
  monthKey: string
  monthLabel: string
  denom: number
  now: number
  pct: number | null
}

interface TotalsRow {
  kelompokName: string
  denom: number
  now: number
  pct: number | null
}

function buildDesaTableRows(
  kelompokList: Kelompok[],
  rows: ProgramReportRow[],
  reportByKelompok: Map<string, MonthlyReportRow>
): (DesaRow | TotalsRow)[] {
  const byReport = new Map<string, ProgramReportRow>()
  for (const r of rows) byReport.set(r.monthly_report_id, r)
  const per: DesaRow[] = kelompokList.map((k) => {
    const report = reportByKelompok.get(k.id)
    const row = report ? byReport.get(report.id) : undefined
    const denom = row?.denominator ?? 0
    const now = row?.count_this_month ?? 0
    const prev = row?.count_prev_month ?? null
    const pct = denom > 0 ? Math.round((now / denom) * 100) : null
    return { kelompokId: k.id, kelompokName: k.value, denom, now, prev, pct }
  })
  const totalDenom = per.reduce((a, b) => a + b.denom, 0)
  const totalNow = per.reduce((a, b) => a + b.now, 0)
  const avgPct =
    totalDenom > 0 ? Math.round((totalNow / totalDenom) * 100) : null
  const totalsRow: TotalsRow = {
    kelompokName: 'Total / Rata',
    denom: totalDenom,
    now: totalNow,
    pct: avgPct,
  }
  return [...per, totalsRow]
}

function buildSingleKelompokTableRows(
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

function DesaProgramTable({ rows }: { rows: (DesaRow | TotalsRow)[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='text-lg'>Kelompok</TableHead>
          <TableHead className='text-right text-lg'>Sensus</TableHead>
          <TableHead className='text-right text-lg'>Lalu</TableHead>
          <TableHead className='text-right text-lg'>Ini</TableHead>
          <TableHead className='text-right text-lg'>%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const isTotals = i === rows.length - 1
          const prev = 'prev' in r ? r.prev : null
          return (
            <TableRow
              key={'kelompokId' in r ? r.kelompokId : 'total'}
              className={isTotals ? 'border-t-2 font-bold' : ''}
            >
              <TableCell className='text-xl font-medium'>
                {r.kelompokName}
              </TableCell>
              <TableCell className='text-right text-xl tabular-nums'>
                {r.denom}
              </TableCell>
              <TableCell className='text-muted-foreground text-right text-xl tabular-nums'>
                {prev ?? '-'}
              </TableCell>
              <TableCell className='text-right text-xl tabular-nums'>
                {r.now}
              </TableCell>
              <TableCell className='text-right text-xl tabular-nums'>
                {r.pct != null ? `${r.pct}%` : '-'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function SingleKelompokProgramTable({ rows }: { rows: SingleRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='text-lg'>Bulan</TableHead>
          <TableHead className='text-right text-lg'>Sensus</TableHead>
          <TableHead className='text-right text-lg'>Jumlah</TableHead>
          <TableHead className='text-right text-lg'>%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.monthKey}>
            <TableCell className='text-xl font-medium'>
              {r.monthLabel}
            </TableCell>
            <TableCell className='text-right text-xl tabular-nums'>
              {r.denom}
            </TableCell>
            <TableCell className='text-right text-xl tabular-nums'>
              {r.now}
            </TableCell>
            <TableCell className='text-right text-xl tabular-nums'>
              {r.pct != null ? `${r.pct}%` : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function buildSlides(data: PresentationData): Slide[] {
  const {
    monthKey,
    kelompokList,
    reports,
    programs,
    metrics,
    sarprasItems,
    sensusSnapshots,
    programReports,
    metricReports,
    sarprasReports,
    shodaqohRows,
    mustinRows,
    kelompokFilter,
    yearlyMonthlyReports = [],
    yearlyProgramReports = [],
  } = data

  const effectiveKelompokList = kelompokFilter
    ? kelompokList.filter((k) => k.id === kelompokFilter)
    : kelompokList

  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)

  const slides: Slide[] = []

  slides.push({
    key: 'cover',
    title: 'Cover',
    render: () => (
      <div className='flex h-full flex-col items-center justify-center gap-6 text-center'>
        <div className='text-6xl font-bold tracking-tight'>
          {kelompokFilter
            ? `Laporan ${effectiveKelompokList[0]?.value ?? ''}`
            : 'Laporan Pembinaan Generus'}
        </div>
        <div className='text-muted-foreground text-4xl'>
          {formatMonthLabel(monthKey)}
        </div>
      </div>
    ),
  })

  slides.push({
    key: 'status',
    title: 'Status Laporan',
    render: () => (
      <div className='flex h-full flex-col gap-6'>
        <h2 className='text-4xl font-bold'>Status Laporan</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='text-xl'>Kelompok</TableHead>
              <TableHead className='text-xl'>Status</TableHead>
              <TableHead className='text-xl'>Ditandai Selesai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {effectiveKelompokList.map((k) => {
              const r = reportByKelompok.get(k.id)
              return (
                <TableRow key={k.id}>
                  <TableCell className='text-2xl font-medium'>
                    {k.value}
                  </TableCell>
                  <TableCell className='text-2xl'>
                    {r
                      ? r.status === 'submitted'
                        ? '✓ Selesai'
                        : '⏳ Belum Selesai'
                      : '— Belum dibuka'}
                  </TableCell>
                  <TableCell className='text-muted-foreground text-xl'>
                    {r?.submitted_at
                      ? new Date(r.submitted_at).toLocaleDateString('id-ID')
                      : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    ),
  })

  slides.push({
    key: 'sensus',
    title: 'Sensus Generus',
    render: () => {
      const snapByKK = new Map<string, SensusSnapshotRow>()
      for (const s of sensusSnapshots)
        snapByKK.set(`${s.kelompok_id}_${s.category_code}_${s.gender}`, s)
      const kelompokIds = effectiveKelompokList.map((k) => k.id)
      return (
        <div className='flex h-full flex-col gap-6'>
          <h2 className='text-4xl font-bold'>Sensus Generus</h2>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-lg'>Kategori</TableHead>
                  {effectiveKelompokList.map((k) => (
                    <TableHead key={k.id} className='text-right text-lg'>
                      {k.value}
                    </TableHead>
                  ))}
                  <TableHead className='text-right text-lg'>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORY_CODES.map((code) => {
                  const per = kelompokIds.map((kid) => {
                    const l = snapByKK.get(`${kid}_${code}_L`)?.count ?? 0
                    const p = snapByKK.get(`${kid}_${code}_P`)?.count ?? 0
                    return l + p
                  })
                  const total = per.reduce((a, b) => a + b, 0)
                  if (total === 0) return null
                  return (
                    <TableRow key={code}>
                      <TableCell className='text-xl font-medium'>
                        {CATEGORY_LABELS[code]}
                      </TableCell>
                      {per.map((n, i) => (
                        <TableCell
                          key={kelompokIds[i]}
                          className='text-right text-xl tabular-nums'
                        >
                          {n || '-'}
                        </TableCell>
                      ))}
                      <TableCell className='text-right text-xl font-semibold tabular-nums'>
                        {total}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )
    },
  })

  for (const p of programs) {
    const rows = programReports.filter((r) => r.program_code === p.code)
    slides.push({
      key: `program-${p.code}`,
      title: p.name,
      render: () => {
        const isSingleKelompok = !!kelompokFilter
        const monthKeys = allMonthKeysForYear(parseInt(monthKey.slice(0, 4), 10))

        let chartData: BarDatum[]
        if (isSingleKelompok) {
          const yearReportByMonth = new Map<string, MonthlyReportRow>()
          for (const r of yearlyMonthlyReports) {
            if (r.kelompok_id === kelompokFilter)
              yearReportByMonth.set(r.month.slice(0, 7), r)
          }
          const yearProgRowByReportId = new Map<string, ProgramReportRow>()
          for (const r of yearlyProgramReports) {
            if (r.program_code === p.code)
              yearProgRowByReportId.set(r.monthly_report_id, r)
          }
          chartData = monthKeys.map((mk) => {
            const report = yearReportByMonth.get(mk)
            const row = report
              ? yearProgRowByReportId.get(report.id)
              : undefined
            return {
              label: monthNameFromKey(mk).slice(0, 3),
              value: row?.count_this_month ?? 0,
              isPlaceholder: mk > monthKey,
            }
          })
        } else {
          const yearProgByReport = new Map<string, ProgramReportRow>()
          for (const r of yearlyProgramReports) {
            if (r.program_code === p.code)
              yearProgByReport.set(r.monthly_report_id, r)
          }
          const monthTotals = new Map<string, number>()
          for (const report of yearlyMonthlyReports) {
            const mk = report.month.slice(0, 7)
            const row = yearProgByReport.get(report.id)
            const prev = monthTotals.get(mk) ?? 0
            monthTotals.set(mk, prev + (row?.count_this_month ?? 0))
          }
          chartData = monthKeys.map((mk) => ({
            label: monthNameFromKey(mk).slice(0, 3),
            value: monthTotals.get(mk) ?? 0,
            isPlaceholder: mk > monthKey,
          }))
        }

        const tableRows = isSingleKelompok
          ? buildSingleKelompokTableRows(
              monthKeys,
              kelompokFilter!,
              p.code,
              yearlyMonthlyReports,
              yearlyProgramReports,
              monthKey
            )
          : buildDesaTableRows(effectiveKelompokList, rows, reportByKelompok)

        return (
          <div className='flex h-full flex-col gap-6'>
            <div>
              <h2 className='text-4xl font-bold tracking-tight'>{p.name}</h2>
              <div className='text-muted-foreground mt-1 text-xl'>
                {p.denominator_label} → {p.count_label}
              </div>
            </div>
            <div className='grid flex-1 grid-cols-2 gap-8 overflow-hidden'>
              <div className='overflow-auto'>
                {isSingleKelompok ? (
                  <SingleKelompokProgramTable rows={tableRows as SingleRow[]} />
                ) : (
                  <DesaProgramTable
                    rows={tableRows as (DesaRow | TotalsRow)[]}
                  />
                )}
              </div>
              <div className='flex items-center justify-center'>
                <div className='w-full'>
                  <HighlightedBar
                    data={chartData}
                    height={400}
                    showValueLabel
                    xAxisLabel='Bulan'
                    yAxisLabel='Jumlah Generus'
                  />
                </div>
              </div>
            </div>
          </div>
        )
      },
    })
  }

  if (metrics.length > 0) {
    slides.push({
      key: 'metrics',
      title: 'Metrics',
      render: () => {
        const byKey = new Map<string, MetricReportRow>()
        for (const r of metricReports)
          byKey.set(`${r.monthly_report_id}_${r.metric_code}`, r)
        return (
          <div className='flex h-full flex-col gap-4 overflow-auto'>
            <h2 className='text-4xl font-bold'>Metrics</h2>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-lg'>Metric</TableHead>
                    {effectiveKelompokList.map((k) => (
                      <TableHead key={k.id} className='text-right text-lg'>
                        {k.value}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m) => (
                    <TableRow key={m.code}>
                      <TableCell className='text-xl font-medium'>
                        {m.name}
                      </TableCell>
                      {effectiveKelompokList.map((k) => {
                        const report = reportByKelompok.get(k.id)
                        const row = report
                          ? byKey.get(`${report.id}_${m.code}`)
                          : undefined
                        const val = row?.current_value ?? null
                        const suffix = m.value_format === 'percent' ? '%' : ''
                        return (
                          <TableCell
                            key={k.id}
                            className='text-right text-xl tabular-nums'
                          >
                            {val != null ? `${val}${suffix}` : '-'}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      },
    })
  }

  slides.push({
    key: 'sarpras',
    title: 'Sarpras',
    render: () => {
      const totalItems = sarprasItems.length
      const per = effectiveKelompokList.map((k) => {
        const report = reportByKelompok.get(k.id)
        const rr = report
          ? sarprasReports.filter((r) => r.monthly_report_id === report.id)
          : []
        const fulfilled = rr.filter((r) => r.is_fulfilled).length
        const pct =
          totalItems > 0 ? Math.round((fulfilled / totalItems) * 100) : 0
        return { k, fulfilled, pct }
      })
      return (
        <div className='flex h-full flex-col gap-4'>
          <h2 className='text-4xl font-bold'>Sarpras — % Pengadaan</h2>
          <div className='text-muted-foreground text-xl'>
            Berdasarkan {totalItems} item aktif.
          </div>
          <div className='flex flex-col gap-4 text-xl'>
            {per.map((e) => (
              <div key={e.k.id} className='flex items-center gap-4'>
                <div className='w-40 font-medium'>{e.k.value}</div>
                <div className='bg-muted h-6 flex-1 rounded'>
                  <div
                    className='bg-primary h-6 rounded transition-all'
                    style={{ width: `${e.pct}%` }}
                  />
                </div>
                <div className='w-24 text-right tabular-nums'>{e.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
  })

  slides.push({
    key: 'shodaqoh',
    title: 'Shodaqoh PPG',
    render: () => {
      const byReport = new Map<string, ShodaqohRow>()
      for (const r of shodaqohRows) byReport.set(r.monthly_report_id, r)
      const per = effectiveKelompokList.map((k) => {
        const report = reportByKelompok.get(k.id)
        const row = report ? byReport.get(report.id) : undefined
        const nominal = Number(row?.nominal ?? 0)
        const kk = row?.jumlah_kk ?? 0
        const rata = kk > 0 ? Math.round(nominal / kk) : 0
        return { k, nominal, kk, rata }
      })
      const totalNom = per.reduce((a, b) => a + b.nominal, 0)
      const totalKK = per.reduce((a, b) => a + b.kk, 0)
      const avgRata = totalKK > 0 ? Math.round(totalNom / totalKK) : 0
      return (
        <div className='flex h-full flex-col gap-4'>
          <h2 className='text-4xl font-bold'>Shodaqoh PPG</h2>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-lg'>Kelompok</TableHead>
                  <TableHead className='text-right text-lg'>Nominal</TableHead>
                  <TableHead className='text-right text-lg'>KK</TableHead>
                  <TableHead className='text-right text-lg'>Rata / KK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {per.map((e) => (
                  <TableRow key={e.k.id}>
                    <TableCell className='text-xl font-medium'>
                      {e.k.value}
                    </TableCell>
                    <TableCell className='text-right text-xl tabular-nums'>
                      Rp {e.nominal.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className='text-right text-xl tabular-nums'>
                      {e.kk}
                    </TableCell>
                    <TableCell className='text-right text-xl tabular-nums'>
                      Rp {e.rata.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className='border-t-2'>
                  <TableCell className='text-xl font-bold'>Total</TableCell>
                  <TableCell className='text-right text-xl font-bold tabular-nums'>
                    Rp {totalNom.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className='text-right text-xl font-bold tabular-nums'>
                    {totalKK}
                  </TableCell>
                  <TableCell className='text-right text-xl font-bold tabular-nums'>
                    Rp {avgRata.toLocaleString('id-ID')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )
    },
  })

  slides.push({
    key: 'mustin',
    title: 'Resume Mustin',
    render: () => (
      <div className='flex h-full flex-col gap-4 overflow-auto'>
        <h2 className='text-4xl font-bold'>Resume Mustin</h2>
        <div className='grid gap-4 lg:grid-cols-2'>
          {effectiveKelompokList.map((k) => {
            const report = reportByKelompok.get(k.id)
            const kkRows = report
              ? mustinRows.filter((r) => r.monthly_report_id === report.id)
              : []
            return (
              <div key={k.id} className='rounded-md border p-4'>
                <div className='mb-2 text-2xl font-bold'>{k.value}</div>
                {kkRows.length === 0 ? (
                  <div className='text-muted-foreground text-lg'>
                    Tidak ada catatan.
                  </div>
                ) : (
                  <div className='flex flex-col gap-2'>
                    {kkRows.map((n) => (
                      <div
                        key={n.id}
                        className='border-primary/50 rounded border-l-4 pl-3 text-lg'
                      >
                        <div className='text-muted-foreground text-xs'>
                          {MUSTIN_STATUS_LABELS[n.status as MustinStatus]}
                        </div>
                        <div className='font-medium'>{n.pokok_masalah}</div>
                        <div className='text-muted-foreground text-sm'>
                          → {n.keputusan_rencana}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    ),
  })

  return slides
}
