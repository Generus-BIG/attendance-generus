import { useMemo } from 'react'
import { Link, useSearch, useNavigate } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Loader2, Presentation, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MonthPicker } from '../components/month-picker'
import { ReportStatusBadge } from '../components/report-status-badge'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  MUSTIN_STATUS_LABELS,
} from '../constants'
import {
  useActiveMetrics,
  useActiveMustinTemplates,
  useActivePrograms,
  useActiveSarprasItems,
  useMonthlyReports,
} from '../hooks/use-lupg-queries'
import {
  type MetricReportRow,
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinStatus,
  type MustinTemplateRow,
  type ProgramReportRow,
  type SarprasReportRow,
  type SensusSnapshotRow,
  type ShodaqohRow,
} from '../types'
import {
  currentMonthKey,
  firstDayOfMonth,
  formatMonthLabel,
  shiftMonth,
} from '../utils/month-utils'
import {
  ProgramCompositeCard,
  type ProgramCompositeCardData,
} from './components/program-composite-card'
import { type HeatmapRow } from './components/program-heatmap-table'

// ---------- Batch fetchers (one query per section across all reports) ----------

async function fetchSensusSnapshotsBatch(reportIds: string[]) {
  if (reportIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_sensus_snapshots')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (error) throw error
  return (data ?? []) as SensusSnapshotRow[]
}

async function fetchProgramReportsBatch(reportIds: string[]) {
  if (reportIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_program_reports')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (error) throw error
  return (data ?? []) as ProgramReportRow[]
}

async function fetchMetricReportsBatch(reportIds: string[]) {
  if (reportIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_metric_reports')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (error) throw error
  return (data ?? []) as MetricReportRow[]
}

async function fetchSarprasReportsBatch(reportIds: string[]) {
  if (reportIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_sarpras_reports')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (error) throw error
  return (data ?? []) as SarprasReportRow[]
}

async function fetchShodaqohBatch(reportIds: string[]) {
  if (reportIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_shodaqoh')
    .select('*')
    .in('monthly_report_id', reportIds)
  if (error) throw error
  return (data ?? []) as ShodaqohRow[]
}

async function fetchMustinBatch(reportIds: string[]) {
  if (reportIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_mustin_notes')
    .select('*')
    .in('monthly_report_id', reportIds)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as MustinNoteRow[]
}

async function fetchKelompokList() {
  const { data, error } = await supabase
    .from('lookup_values')
    .select('id, value')
    .eq('type', 'GROUP')
    .order('value')
  if (error) throw error
  return (data ?? []) as { id: string; value: string }[]
}

interface RecapSearch {
  month?: string
}

type KelompokLite = { id: string; value: string }

export function RekapDesa() {
  const search = useSearch({ strict: false }) as RecapSearch
  const navigate = useNavigate()
  const monthKey = search.month ?? currentMonthKey()

  const setMonth = (m: string) => {
    navigate({
      to: '/admin/lupg/recap',
      search: { month: m },
    })
  }

  const { data: kelompokList = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: fetchKelompokList,
  })

  // 5-month rolling window (oldest → current). Used ONLY for the program composite cards.
  const windowMonthKeys = useMemo(
    () => [
      shiftMonth(monthKey, -4),
      shiftMonth(monthKey, -3),
      shiftMonth(monthKey, -2),
      shiftMonth(monthKey, -1),
      monthKey,
    ],
    [monthKey]
  )
  const fromWindowMonth = windowMonthKeys[0]

  const { data: reportsRaw = [], isLoading: reportsLoading } = useMonthlyReports(
    {
      fromMonth: fromWindowMonth,
      toMonth: monthKey,
    }
  )
  const monthStart = firstDayOfMonth(monthKey)
  // Current month only — used by every card except program composites.
  const monthReports = reportsRaw.filter((r) =>
    r.month.startsWith(monthStart.slice(0, 7))
  )
  const reportIds = monthReports.map((r) => r.id)
  const reportIdsKey = reportIds.join(',')

  // All reports in the 5-month window — used by program composites.
  const windowReports = reportsRaw
  const windowReportIds = windowReports.map((r) => r.id)
  const windowReportIdsKey = windowReportIds.join(',')

  const [sensusQ, programsBatchQ, metricsBatchQ, sarprasBatchQ, shodaqohQ, mustinQ] =
    useQueries({
      queries: [
        {
          queryKey: ['lupg', 'recap', 'sensus', monthKey, reportIdsKey],
          queryFn: () => fetchSensusSnapshotsBatch(reportIds),
          enabled: reportIds.length > 0,
        },
        {
          queryKey: ['lupg', 'recap', 'programs', monthKey, windowReportIdsKey],
          queryFn: () => fetchProgramReportsBatch(windowReportIds),
          enabled: windowReportIds.length > 0,
        },
        {
          queryKey: ['lupg', 'recap', 'metrics', monthKey, reportIdsKey],
          queryFn: () => fetchMetricReportsBatch(reportIds),
          enabled: reportIds.length > 0,
        },
        {
          queryKey: ['lupg', 'recap', 'sarpras', monthKey, reportIdsKey],
          queryFn: () => fetchSarprasReportsBatch(reportIds),
          enabled: reportIds.length > 0,
        },
        {
          queryKey: ['lupg', 'recap', 'shodaqoh', monthKey, reportIdsKey],
          queryFn: () => fetchShodaqohBatch(reportIds),
          enabled: reportIds.length > 0,
        },
        {
          queryKey: ['lupg', 'recap', 'mustin', monthKey, reportIdsKey],
          queryFn: () => fetchMustinBatch(reportIds),
          enabled: reportIds.length > 0,
        },
      ],
    })

  const { data: programs = [] } = useActivePrograms()
  const { data: metrics = [] } = useActiveMetrics()
  const { data: sarprasItems = [] } = useActiveSarprasItems()
  const { data: mustinTemplates = [] } = useActiveMustinTemplates()

  const sensusSnapshots = sensusQ.data ?? []
  const programReports = programsBatchQ.data ?? []
  const metricReports = metricsBatchQ.data ?? []
  const sarprasReports = sarprasBatchQ.data ?? []
  const shodaqohRows = shodaqohQ.data ?? []
  const mustinRows = mustinQ.data ?? []

  const compositeDataByProgram = useMemo(() => {
    // Index monthly reports by (kelompok, monthKey).
    const reportByKelompokMonth = new Map<string, MonthlyReportRow>()
    for (const r of windowReports) {
      const mk = r.month.slice(0, 7)
      reportByKelompokMonth.set(`${r.kelompok_id}__${mk}`, r)
    }

    const out = new Map<string, ProgramCompositeCardData>()

    for (const p of programs) {
      // Index program_reports by monthly_report_id for this program only.
      const progByReport = new Map<string, (typeof programReports)[number]>()
      for (const pr of programReports) {
        if (pr.program_code === p.code) {
          progByReport.set(pr.monthly_report_id, pr)
        }
      }

      const rows: HeatmapRow[] = kelompokList.map((k) => {
        const cells = windowMonthKeys.map((mk) => {
          const report = reportByKelompokMonth.get(`${k.id}__${mk}`)
          const pr = report ? progByReport.get(report.id) : undefined
          const denom = pr?.denominator ?? 0
          const count = pr?.count_this_month ?? 0
          const value = denom > 0 ? Math.round((count / denom) * 100) : null
          return { value, count, denom }
        })
        return {
          kelompokId: k.id,
          kelompokName: k.value,
          cells,
        }
      })

      // For drawer: current-month program report + monthly_report_id.
      const currentRowByKelompok = new Map<
        string,
        (typeof programReports)[number]
      >()
      const monthlyReportIdByKelompok = new Map<string, string>()
      for (const k of kelompokList) {
        const report = reportByKelompokMonth.get(`${k.id}__${monthKey}`)
        if (report) {
          monthlyReportIdByKelompok.set(k.id, report.id)
          const pr = progByReport.get(report.id)
          if (pr) currentRowByKelompok.set(k.id, pr)
        }
      }

      out.set(p.code, {
        monthKeys: windowMonthKeys,
        currentMonthKey: monthKey,
        rows,
        monthlyReportIdByKelompok,
        currentRowByKelompok,
      })
    }
    return out
  }, [
    programs,
    programReports,
    windowReports,
    kelompokList,
    windowMonthKeys,
    monthKey,
  ])

  const sectionsLoading =
    reportIds.length > 0 &&
    (sensusQ.isLoading ||
      programsBatchQ.isLoading ||
      metricsBatchQ.isLoading ||
      sarprasBatchQ.isLoading ||
      shodaqohQ.isLoading ||
      mustinQ.isLoading)

  const reportByKelompok = useMemo(() => {
    const m = new Map<string, MonthlyReportRow>()
    for (const r of monthReports) m.set(r.kelompok_id, r)
    return m
  }, [monthReports])

  return (
    <>
      <style>{`
        @media print {
          [data-sidebar],
          aside,
          header.header-fixed,
          header.sticky,
          header.fixed,
          nav,
          .print\\:hidden {
            display: none !important;
          }
          main, [role="main"] {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
          table { break-inside: avoid; }
          .card, [class*="border"] { box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 print:gap-2 sm:gap-6'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Rekap Desa</h2>
            <p className='text-muted-foreground'>
              Konsolidasi laporan bulanan seluruh kelompok.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 print:hidden'>
            <MonthPicker monthKey={monthKey} onChange={setMonth} />
            <Link
              to='/admin/lupg/recap/present'
              search={{ month: monthKey }}
            >
              <Button variant='outline'>
                <Presentation className='mr-2 h-4 w-4' />
                Presentation
              </Button>
            </Link>
            <Button variant='outline' onClick={() => window.print()}>
              <Printer className='mr-2 h-4 w-4' />
              Export PDF
            </Button>
          </div>
        </div>

        {reportsLoading ? (
          <Card>
            <CardContent className='text-muted-foreground flex items-center justify-center gap-2 py-8'>
              <Loader2 className='h-5 w-5 animate-spin' />
              Memuat laporan...
            </CardContent>
          </Card>
        ) : monthReports.length === 0 ? (
          <>
            <StatusGridCard
              kelompokList={kelompokList}
              reportByKelompok={reportByKelompok}
              monthLabel={formatMonthLabel(monthKey)}
            />
            <div className='text-muted-foreground rounded-lg border border-dashed p-10 text-center'>
              Belum ada laporan untuk {formatMonthLabel(monthKey)}.
            </div>
          </>
        ) : (
          <div className='flex flex-col gap-4'>
            <StatusGridCard
              kelompokList={kelompokList}
              reportByKelompok={reportByKelompok}
              monthLabel={formatMonthLabel(monthKey)}
            />

            {sectionsLoading ? (
              <Card>
                <CardContent className='text-muted-foreground flex items-center justify-center gap-2 py-8'>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  Memuat rekap...
                </CardContent>
              </Card>
            ) : (
              <>
                <SensusRecapCard
                  kelompokList={kelompokList}
                  snapshots={sensusSnapshots}
                />

                {programs.map((p) => {
                  const compositeData = compositeDataByProgram.get(p.code)
                  if (!compositeData) return null
                  return (
                    <ProgramCompositeCard
                      key={`${p.code}__${monthKey}`}
                      program={p}
                      data={compositeData}
                    />
                  )
                })}

                <MetricsRecapCard
                  kelompokList={kelompokList}
                  reports={monthReports}
                  metrics={metrics}
                  rows={metricReports}
                />

                <SarprasRecapCard
                  kelompokList={kelompokList}
                  reports={monthReports}
                  items={sarprasItems}
                  rows={sarprasReports}
                />

                <ShodaqohRecapCard
                  kelompokList={kelompokList}
                  reports={monthReports}
                  rows={shodaqohRows}
                />

                <MustinRecapCard
                  kelompokList={kelompokList}
                  reports={monthReports}
                  rows={mustinRows}
                  templates={mustinTemplates}
                />
              </>
            )}
          </div>
        )}
      </Main>
    </>
  )
}

// ---------- Subcomponents ----------

interface SectionProps {
  kelompokList: KelompokLite[]
  reports: MonthlyReportRow[]
}

function StatusGridCard({
  kelompokList,
  reportByKelompok,
  monthLabel,
}: {
  kelompokList: KelompokLite[]
  reportByKelompok: Map<string, MonthlyReportRow>
  monthLabel: string
}) {
  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Status Laporan</CardTitle>
        <CardDescription>
          Status laporan {monthLabel} per kelompok.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kelompok</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ditandai Selesai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kelompokList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className='text-muted-foreground text-center text-sm'
                >
                  Tidak ada kelompok.
                </TableCell>
              </TableRow>
            ) : (
              kelompokList.map((k) => {
                const r = reportByKelompok.get(k.id)
                return (
                  <TableRow key={k.id}>
                    <TableCell className='font-medium'>{k.value}</TableCell>
                    <TableCell>
                      {r ? (
                        <ReportStatusBadge
                          status={r.status as 'draft' | 'submitted'}
                          locked={r.locked}
                        />
                      ) : (
                        <span className='text-muted-foreground text-xs'>
                          Belum dibuka
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {r?.submitted_at
                        ? new Date(r.submitted_at).toLocaleString('id-ID')
                        : '-'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function SensusRecapCard({
  kelompokList,
  snapshots,
}: {
  kelompokList: KelompokLite[]
  snapshots: SensusSnapshotRow[]
}) {
  const kelompokIds = kelompokList.map((k) => k.id)
  const snapByKK = new Map<string, SensusSnapshotRow>()
  for (const s of snapshots) {
    snapByKK.set(`${s.kelompok_id}_${s.category_code}_${s.gender}`, s)
  }

  const rows = CATEGORY_CODES.map((code) => {
    const perKK = kelompokIds.map((kid) => {
      const l = snapByKK.get(`${kid}_${code}_L`)?.count ?? 0
      const p = snapByKK.get(`${kid}_${code}_P`)?.count ?? 0
      return l + p
    })
    const total = perKK.reduce((a, b) => a + b, 0)
    return { code, perKK, total }
  }).filter((r) => r.total > 0)

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Sensus Generus (snapshot saat submit)</CardTitle>
        <CardDescription>
          Total L + P per kategori, per kelompok.
        </CardDescription>
      </CardHeader>
      <CardContent className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              {kelompokList.map((k) => (
                <TableHead key={k.id} className='text-right'>
                  {k.value}
                </TableHead>
              ))}
              <TableHead className='text-right'>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={kelompokList.length + 2}
                  className='text-muted-foreground text-center text-sm'
                >
                  Tidak ada snapshot sensus.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className='font-medium'>
                    {
                      CATEGORY_LABELS[
                        row.code as keyof typeof CATEGORY_LABELS
                      ]
                    }
                  </TableCell>
                  {row.perKK.map((n, i) => (
                    <TableCell
                      key={kelompokIds[i]}
                      className='text-right tabular-nums'
                    >
                      {n || '-'}
                    </TableCell>
                  ))}
                  <TableCell className='text-right font-semibold tabular-nums'>
                    {row.total}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface MetricDefLite {
  code: string
  name: string
  value_format: string
  category_label: string | null
}

function MetricsRecapCard({
  kelompokList,
  reports,
  metrics,
  rows,
}: SectionProps & {
  metrics: MetricDefLite[]
  rows: MetricReportRow[]
}) {
  const grouped = metrics.reduce<Record<string, MetricDefLite[]>>((acc, m) => {
    const key = m.category_label ?? 'Lainnya'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})
  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)
  const byKey = new Map<string, MetricReportRow>()
  for (const r of rows) byKey.set(`${r.monthly_report_id}_${r.metric_code}`, r)

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Metrics</CardTitle>
        <CardDescription>Nilai per metric, per kelompok.</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {Object.entries(grouped).length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            Tidak ada metric aktif.
          </div>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className='text-muted-foreground mb-2 text-sm font-semibold'>
                {group}
              </div>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      {kelompokList.map((k) => (
                        <TableHead key={k.id} className='text-right'>
                          {k.value}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((m) => (
                      <TableRow key={m.code}>
                        <TableCell className='font-medium'>{m.name}</TableCell>
                        {kelompokList.map((k) => {
                          const report = reportByKelompok.get(k.id)
                          const row = report
                            ? byKey.get(`${report.id}_${m.code}`)
                            : undefined
                          const val = row?.current_value ?? null
                          const suffix =
                            m.value_format === 'percent' ? '%' : ''
                          return (
                            <TableCell
                              key={k.id}
                              className='text-right tabular-nums'
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
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SarprasRecapCard({
  kelompokList,
  reports,
  items,
  rows,
}: SectionProps & {
  items: Array<{ id: string; name: string }>
  rows: SarprasReportRow[]
}) {
  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)
  const totalItems = items.length

  const perKK = kelompokList.map((k) => {
    const report = reportByKelompok.get(k.id)
    const reportRows = report
      ? rows.filter((r) => r.monthly_report_id === report.id)
      : []
    const fulfilled = reportRows.filter((r) => r.is_fulfilled).length
    const pct = totalItems > 0 ? Math.round((fulfilled / totalItems) * 100) : 0
    return { k, fulfilled, pct }
  })

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Sarpras — % Pengadaan</CardTitle>
        <CardDescription>
          Berdasarkan {totalItems} item aktif.
        </CardDescription>
      </CardHeader>
      <CardContent className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kelompok</TableHead>
              <TableHead className='text-right'>Fulfilled</TableHead>
              <TableHead className='text-right'>%</TableHead>
              <TableHead>Bar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perKK.map((e) => (
              <TableRow key={e.k.id}>
                <TableCell className='font-medium'>{e.k.value}</TableCell>
                <TableCell className='text-right tabular-nums'>
                  {e.fulfilled}/{totalItems}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {e.pct}%
                </TableCell>
                <TableCell className='min-w-40'>
                  <div className='bg-muted h-2 w-full rounded'>
                    <div
                      className='bg-primary h-2 rounded'
                      style={{ width: `${e.pct}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ShodaqohRecapCard({
  kelompokList,
  reports,
  rows,
}: SectionProps & {
  rows: ShodaqohRow[]
}) {
  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)
  const byReport = new Map<string, ShodaqohRow>()
  for (const r of rows) byReport.set(r.monthly_report_id, r)

  const perKK = kelompokList.map((k) => {
    const report = reportByKelompok.get(k.id)
    const row = report ? byReport.get(report.id) : undefined
    const nominal = Number(row?.nominal ?? 0)
    const kk = row?.jumlah_kk ?? 0
    const rata = kk > 0 ? Math.round(nominal / kk) : 0
    return { k, nominal, kk, rata }
  })

  const totalNominal = perKK.reduce((a, b) => a + b.nominal, 0)
  const totalKK = perKK.reduce((a, b) => a + b.kk, 0)
  const avgRata = totalKK > 0 ? Math.round(totalNominal / totalKK) : 0

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Shodaqoh PPG</CardTitle>
        <CardDescription>
          Nominal dan rata-rata per KK, per kelompok.
        </CardDescription>
      </CardHeader>
      <CardContent className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kelompok</TableHead>
              <TableHead className='text-right'>Nominal</TableHead>
              <TableHead className='text-right'>Jumlah KK</TableHead>
              <TableHead className='text-right'>Rata / KK</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perKK.map((e) => (
              <TableRow key={e.k.id}>
                <TableCell className='font-medium'>{e.k.value}</TableCell>
                <TableCell className='text-right tabular-nums'>
                  Rp {e.nominal.toLocaleString('id-ID')}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {e.kk}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  Rp {e.rata.toLocaleString('id-ID')}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className='border-t-2 font-semibold'>
              <TableCell>Total</TableCell>
              <TableCell className='text-right tabular-nums'>
                Rp {totalNominal.toLocaleString('id-ID')}
              </TableCell>
              <TableCell className='text-right tabular-nums'>
                {totalKK}
              </TableCell>
              <TableCell className='text-right tabular-nums'>
                Rp {avgRata.toLocaleString('id-ID')}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function MustinRecapCard({
  kelompokList,
  reports,
  rows,
  templates,
}: SectionProps & {
  rows: MustinNoteRow[]
  templates: MustinTemplateRow[]
}) {
  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)

  const templateByCode = new Map<string, MustinTemplateRow>()
  for (const t of templates) templateByCode.set(t.code, t)

  const sortNotes = (notes: MustinNoteRow[]): MustinNoteRow[] => {
    return [...notes].sort((a, b) => {
      const ta = a.template_code ? templateByCode.get(a.template_code) : undefined
      const tb = b.template_code ? templateByCode.get(b.template_code) : undefined
      const aOrder = ta ? ta.sort_order : 1_000_000 + a.sort_order
      const bOrder = tb ? tb.sort_order : 1_000_000 + b.sort_order
      return aOrder - bOrder
    })
  }

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Resume Mustin</CardTitle>
        <CardDescription>Catatan bulanan per kelompok.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-5'>
          {kelompokList.map((k) => {
            const report = reportByKelompok.get(k.id)
            const kkRows = report
              ? sortNotes(rows.filter((r) => r.monthly_report_id === report.id))
              : []
            return (
              <div key={k.id} className='flex flex-col gap-2'>
                <div className='flex items-center justify-between border-b pb-1'>
                  <span className='font-semibold'>{k.value}</span>
                  <span className='text-muted-foreground text-xs'>
                    {kkRows.length} item
                  </span>
                </div>
                {kkRows.length === 0 ? (
                  <div className='text-muted-foreground text-sm'>
                    Tidak ada catatan.
                  </div>
                ) : (
                  <div className='flex flex-col gap-2'>
                    {kkRows.map((n) => {
                      const tmpl = n.template_code
                        ? templateByCode.get(n.template_code)
                        : undefined
                      const subs =
                        tmpl && Array.isArray(tmpl.sub_items)
                          ? (tmpl.sub_items.filter(
                              (v): v is string => typeof v === 'string'
                            ) as string[])
                          : []
                      const showStatusBadge =
                        !tmpl || n.status !== 'open'
                      return (
                        <div
                          key={n.id}
                          className='rounded-md border p-3 text-sm'
                        >
                          {(showStatusBadge || n.deadline || n.pic) && (
                            <div className='mb-2 flex flex-wrap items-center gap-2'>
                              {showStatusBadge && (
                                <span className='bg-muted inline-flex items-center rounded-full px-2 py-0.5 text-xs'>
                                  {
                                    MUSTIN_STATUS_LABELS[
                                      n.status as MustinStatus
                                    ]
                                  }
                                </span>
                              )}
                              {n.deadline && (
                                <span className='text-muted-foreground text-xs'>
                                  Deadline:{' '}
                                  {new Date(n.deadline).toLocaleDateString(
                                    'id-ID'
                                  )}
                                </span>
                              )}
                              {n.pic && (
                                <span className='text-muted-foreground text-xs'>
                                  PIC: {n.pic}
                                </span>
                              )}
                            </div>
                          )}
                          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
                            <div>
                              <div className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                                Pokok Masalah
                              </div>
                              <div className='mt-1 whitespace-pre-wrap font-medium'>
                                {n.pokok_masalah}
                              </div>
                              {subs.length > 0 && (
                                <ol className='text-muted-foreground mt-1 list-[lower-alpha] pl-5 text-xs'>
                                  {subs.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ol>
                              )}
                            </div>
                            <div>
                              <div className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                                Keputusan / Rencana
                              </div>
                              <div className='mt-1 whitespace-pre-wrap'>
                                {n.keputusan_rencana || (
                                  <span className='text-muted-foreground italic'>
                                    (kosong)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
