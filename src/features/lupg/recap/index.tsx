import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, useSearch, useNavigate } from '@tanstack/react-router'
import { id as idLocale } from 'date-fns/locale'
import { FileDown, Inbox, Loader2, Presentation } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { MonthPicker } from '../components/month-picker'
import { ReportStatusBadge } from '../components/report-status-badge'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  MUSTIN_STATUS_LABELS,
  type CategoryCode,
  PROGRAM_ORDER,
} from '../constants'
import {
  useActiveCharacterMonitoringActivities,
  useActiveMetrics,
  useActiveMustinTemplates,
  useActivePrograms,
  useActiveSarprasItems,
  useCharacterMonitoringReportsBatch,
  useCharacterTargetItemsForMonth,
  useCharacterTargetReportsBatch,
  useMonthlyReports,
} from '../hooks/use-lupg-queries'
import {
  type DerivedGpnSensusRow,
  type MetricReportRow,
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinStatus,
  type MustinTemplateRow,
  type ProgramReportRow,
  type SarprasReportRow,
  type SensusGender,
  type SensusRow,
  type SensusSnapshotRow,
  type ShodaqohRow,
} from '../types'
import {
  firstDayOfMonth,
  formatMonthLabel,
  isReportMonthAvailable,
  reportMonthKey,
  shiftMonth,
} from '../utils/month-utils'
import { CharacterMonitoringRecap } from './components/character-monitoring-recap'
import { CharacterTargetRecap } from './components/character-target-recap'
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

async function fetchSensusMasterBatch(kelompokIds: string[]) {
  if (kelompokIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_sensus')
    .select('*')
    .in('kelompok_id', kelompokIds)
    .order('category_code')
    .order('gender')
  if (error) throw error
  return (data ?? []) as SensusRow[]
}

async function fetchDerivedGpnSensusBatch(kelompokIds: string[]) {
  if (kelompokIds.length === 0) return []
  const { data, error } = await supabase
    .from('lupg_sensus_participant_derived')
    .select('*')
    .in('kelompok_id', kelompokIds)
    .order('category_code')
    .order('gender')
  if (error) throw error
  return (data ?? []) as DerivedGpnSensusRow[]
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
  const monthKey =
    search.month && isReportMonthAvailable(search.month)
      ? search.month
      : reportMonthKey()

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

  const { data: reportsRaw = [], isLoading: reportsLoading } =
    useMonthlyReports({
      fromMonth: fromWindowMonth,
      toMonth: monthKey,
    })
  const monthStart = firstDayOfMonth(monthKey)
  // Current month only — used by every card except program composites.
  const monthReports = reportsRaw.filter((r) =>
    r.month.startsWith(monthStart.slice(0, 7))
  )
  const reportIds = monthReports.map((r) => r.id)
  const reportIdsKey = reportIds.join(',')
  const kelompokIds = useMemo(
    () => kelompokList.map((kelompok) => kelompok.id),
    [kelompokList]
  )
  const kelompokIdsKey = kelompokIds.join(',')

  // All reports in the 5-month window — used by program composites.
  const windowReports = reportsRaw
  const windowReportIds = windowReports.map((r) => r.id)
  const windowReportIdsKey = windowReportIds.join(',')

  const [
    sensusQ,
    programsBatchQ,
    metricsBatchQ,
    sarprasBatchQ,
    shodaqohQ,
    mustinQ,
  ] = useQueries({
    queries: [
      {
        queryKey: [
          'lupg',
          'recap',
          'sensus',
          monthKey,
          reportIdsKey,
          reportIds,
        ] as const,
        queryFn: () => fetchSensusSnapshotsBatch(reportIds),
        enabled: reportIds.length > 0,
      },
      {
        queryKey: [
          'lupg',
          'recap',
          'programs',
          monthKey,
          windowReportIdsKey,
          windowReportIds,
        ] as const,
        queryFn: () => fetchProgramReportsBatch(windowReportIds),
        enabled: windowReportIds.length > 0,
      },
      {
        queryKey: [
          'lupg',
          'recap',
          'metrics',
          monthKey,
          reportIdsKey,
          reportIds,
        ] as const,
        queryFn: () => fetchMetricReportsBatch(reportIds),
        enabled: reportIds.length > 0,
      },
      {
        queryKey: [
          'lupg',
          'recap',
          'sarpras',
          monthKey,
          reportIdsKey,
          reportIds,
        ] as const,
        queryFn: () => fetchSarprasReportsBatch(reportIds),
        enabled: reportIds.length > 0,
      },
      {
        queryKey: [
          'lupg',
          'recap',
          'shodaqoh',
          monthKey,
          reportIdsKey,
          reportIds,
        ] as const,
        queryFn: () => fetchShodaqohBatch(reportIds),
        enabled: reportIds.length > 0,
      },
      {
        queryKey: [
          'lupg',
          'recap',
          'mustin',
          monthKey,
          reportIdsKey,
          reportIds,
        ] as const,
        queryFn: () => fetchMustinBatch(reportIds),
        enabled: reportIds.length > 0,
      },
    ],
  })

  const { data: sensusMasterRows = [], isLoading: sensusMasterLoading } =
    useQuery({
      queryKey: [
        'lupg',
        'recap',
        'sensus-master',
        kelompokIdsKey,
        kelompokIds,
      ] as const,
      queryFn: () => fetchSensusMasterBatch(kelompokIds),
      enabled: kelompokIds.length > 0,
    })

  const { data: derivedGpnRows = [], isLoading: derivedGpnLoading } = useQuery({
    queryKey: [
      'lupg',
      'recap',
      'sensus-gpn-derived',
      kelompokIdsKey,
      kelompokIds,
    ] as const,
    queryFn: () => fetchDerivedGpnSensusBatch(kelompokIds),
    enabled: kelompokIds.length > 0,
  })

  const { data: rawPrograms = [] } = useActivePrograms()
  const programs = useMemo(() => {
    const byCode = new Map(rawPrograms.map((p) => [p.code, p]))
    const ordered: typeof rawPrograms = []
    for (const code of PROGRAM_ORDER) {
      const p = byCode.get(code)
      if (p) ordered.push(p)
    }
    for (const p of rawPrograms) {
      if (!PROGRAM_ORDER.includes(p.code as (typeof PROGRAM_ORDER)[number])) {
        ordered.push(p)
      }
    }
    return ordered
  }, [rawPrograms])
  const { data: metrics = [] } = useActiveMetrics()
  const { data: sarprasItems = [] } = useActiveSarprasItems()
  const { data: mustinTemplates = [] } = useActiveMustinTemplates()
  const {
    data: characterActivities = [],
    isLoading: characterActivitiesLoading,
  } = useActiveCharacterMonitoringActivities()
  const { data: characterReports = [], isLoading: characterReportsLoading } =
    useCharacterMonitoringReportsBatch(reportIds)
  const recapYear = Number(monthKey.slice(0, 4))
  const recapMonthIndex = Number(monthKey.slice(5, 7))
  const { data: characterTargetData, isLoading: characterTargetItemsLoading } =
    useCharacterTargetItemsForMonth(recapYear, recapMonthIndex)
  const {
    data: characterTargetReports = [],
    isLoading: characterTargetReportsLoading,
  } = useCharacterTargetReportsBatch(reportIds)

  const sensusSnapshots = useMemo(() => sensusQ.data ?? [], [sensusQ.data])
  const programReports = useMemo(
    () => programsBatchQ.data ?? [],
    [programsBatchQ.data]
  )
  const metricReports = useMemo(
    () => metricsBatchQ.data ?? [],
    [metricsBatchQ.data]
  )
  const sarprasReports = useMemo(
    () => sarprasBatchQ.data ?? [],
    [sarprasBatchQ.data]
  )
  const shodaqohRows = useMemo(() => shodaqohQ.data ?? [], [shodaqohQ.data])
  const mustinRows = useMemo(() => mustinQ.data ?? [], [mustinQ.data])

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
      sensusMasterLoading ||
      derivedGpnLoading ||
      programsBatchQ.isLoading ||
      metricsBatchQ.isLoading ||
      sarprasBatchQ.isLoading ||
      shodaqohQ.isLoading ||
      mustinQ.isLoading ||
      characterActivitiesLoading ||
      characterReportsLoading ||
      characterTargetItemsLoading ||
      characterTargetReportsLoading)

  const reportByKelompok = useMemo(() => {
    const m = new Map<string, MonthlyReportRow>()
    for (const r of monthReports) m.set(r.kelompok_id, r)
    return m
  }, [monthReports])

  // ponytail: same RPC pattern as presentation/index.tsx; raw reports lack display names.
  const { data: editorNameByReport = new Map<string, string | null>() } =
    useQuery({
      queryKey: ['lupg', 'recap-report-editors', reportIdsKey],
      queryFn: async () => {
        const entries = await Promise.all(
          monthReports.map(async (r) => {
            if (!r.last_edited_by) return [r.id, null] as const
            const { data, error } = await supabase.rpc(
              'lupg_get_last_editor_display',
              { p_report_id: r.id }
            )
            if (error) throw error
            return [r.id, (data as string | null) ?? null] as const
          })
        )
        return new Map<string, string | null>(entries)
      },
      enabled: monthReports.length > 0,
    })

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
      <Main className='flex flex-1 flex-col gap-5 sm:gap-7 print:gap-2'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='flex flex-col gap-1'>
            <span className='text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase'>
              Rekap Desa
            </span>
            <h2 className='text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]'>
              {formatMonthLabel(monthKey)}
            </h2>
            <p className='text-sm text-muted-foreground'>
              Summary laporan bulanan seluruh kelompok.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 print:hidden'>
            <MonthPicker
              monthKey={monthKey}
              onChange={setMonth}
              maxMonthKey={reportMonthKey()}
            />
            <span
              aria-hidden='true'
              className='hidden h-6 w-px bg-border sm:inline-block'
            />
            <Link to='/admin/lupg/recap/present' search={{ month: monthKey }}>
              <Button variant='outline' size='sm'>
                <Presentation className='mr-2 h-4 w-4' />
                Presentation
              </Button>
            </Link>
            <Button variant='outline' size='sm' onClick={() => window.print()}>
              <FileDown className='mr-2 h-4 w-4' />
              Export PDF
            </Button>
          </div>
        </div>

        {reportsLoading ? (
          <Card>
            <CardContent className='flex items-center justify-center gap-2 py-8 text-muted-foreground'>
              <Loader2 className='h-5 w-5 animate-spin' />
              Memuat laporan...
            </CardContent>
          </Card>
        ) : monthReports.length === 0 ? (
          <>
            <StatusGridCard
              kelompokList={kelompokList}
              reportByKelompok={reportByKelompok}
              editorNameByReport={editorNameByReport}
              monthLabel={formatMonthLabel(monthKey)}
            />
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 px-6 py-12 text-center'>
              <Inbox
                className='h-8 w-8 text-muted-foreground/70'
                aria-hidden='true'
              />
              <p className='text-sm font-medium'>
                Belum ada laporan untuk {formatMonthLabel(monthKey)}.
              </p>
              <p className='max-w-sm text-xs text-muted-foreground'>
                Rekap akan muncul setelah kelompok mulai mengisi laporan
                bulanan.
              </p>
            </div>
          </>
        ) : (
          <div className='flex flex-col gap-4'>
            <StatusGridCard
              kelompokList={kelompokList}
              reportByKelompok={reportByKelompok}
              editorNameByReport={editorNameByReport}
              monthLabel={formatMonthLabel(monthKey)}
            />

            {sectionsLoading ? (
              <Card>
                <CardContent className='flex items-center justify-center gap-2 py-8 text-muted-foreground'>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  Memuat rekap...
                </CardContent>
              </Card>
            ) : (
              <>
                <SensusRecapCard
                  kelompokList={kelompokList}
                  snapshots={sensusSnapshots}
                  masterRows={sensusMasterRows}
                  derivedRows={derivedGpnRows}
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

                <CharacterMonitoringRecap
                  kelompokList={kelompokList}
                  reports={monthReports}
                  activities={characterActivities}
                  rows={characterReports}
                />

                <CharacterTargetRecap
                  kelompokList={kelompokList}
                  reports={monthReports}
                  items={characterTargetData?.items ?? []}
                  rows={characterTargetReports}
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
  editorNameByReport,
  monthLabel,
}: {
  kelompokList: KelompokLite[]
  reportByKelompok: Map<string, MonthlyReportRow>
  editorNameByReport?: Map<string, string | null>
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
              <TableHead className='w-[130px]'>Kelompok</TableHead>
              <TableHead className='w-[160px]'>Status</TableHead>
              <TableHead className='w-[210px] whitespace-nowrap'>
                Last Edited
              </TableHead>
              <TableHead className='w-[170px] whitespace-nowrap'>
                Ditandai Selesai
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kelompokList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className='text-center text-sm text-muted-foreground'
                >
                  Tidak ada kelompok.
                </TableCell>
              </TableRow>
            ) : (
              kelompokList.map((k) => {
                const r = reportByKelompok.get(k.id)
                // ponytail: same admin-masking as presentation render-status.tsx
                const rawEditor = r ? editorNameByReport?.get(r.id) : null
                const editorName =
                  rawEditor && !/admin/i.test(rawEditor) ? rawEditor : null
                return (
                  <TableRow key={k.id}>
                    <TableCell className='font-medium whitespace-nowrap'>
                      {k.value}
                    </TableCell>
                    <TableCell className='whitespace-nowrap'>
                      {r ? (
                        <ReportStatusBadge
                          status={r.status as 'draft' | 'submitted'}
                          locked={r.locked}
                        />
                      ) : (
                        <span className='text-xs text-muted-foreground'>
                          Belum dibuka
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {r?.last_edited_at ? (
                        <span className='flex flex-col'>
                          <span className='whitespace-nowrap tabular-nums'>
                            {format(
                              parseISO(r.last_edited_at),
                              'dd MMM yyyy, HH:mm',
                              { locale: idLocale }
                            )}
                          </span>
                          {editorName && (
                            <span
                              className='max-w-[220px] truncate text-xs opacity-80'
                              title={editorName}
                            >
                              by {editorName}
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className='text-sm whitespace-nowrap text-muted-foreground tabular-nums'>
                      {r?.submitted_at
                        ? format(
                            parseISO(r.submitted_at),
                            'dd MMM yyyy, HH:mm',
                            {
                              locale: idLocale,
                            }
                          )
                        : '—'}
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
  masterRows,
  derivedRows,
}: {
  kelompokList: KelompokLite[]
  snapshots: SensusSnapshotRow[]
  masterRows: SensusRow[]
  derivedRows: DerivedGpnSensusRow[]
}) {
  const kelompokIds = kelompokList.map((k) => k.id)
  const snapByKK = new Map<string, SensusSnapshotRow>()
  for (const s of snapshots) {
    snapByKK.set(makeSensusCellKey(s.kelompok_id, s.category_code, s.gender), s)
  }

  const masterByKK = new Map<string, SensusRow>()
  for (const row of masterRows) {
    masterByKK.set(
      makeSensusCellKey(row.kelompok_id, row.category_code, row.gender),
      row
    )
  }

  const derivedByKK = new Map<string, DerivedGpnSensusRow>()
  for (const row of derivedRows) {
    derivedByKK.set(
      makeSensusCellKey(row.kelompok_id, row.category_code, row.gender),
      row
    )
  }

  const rows = CATEGORY_CODES.map((code) => {
    const perKK = kelompokIds.map((kid) => {
      const l = getSensusCellCount({
        kelompokId: kid,
        code,
        gender: 'L',
        snapByKK,
        masterByKK,
        derivedByKK,
      })
      const p = getSensusCellCount({
        kelompokId: kid,
        code,
        gender: 'P',
        snapByKK,
        masterByKK,
        derivedByKK,
      })
      return l + p
    })
    const l = kelompokIds.reduce(
      (sum, kid) =>
        sum +
        getSensusCellCount({
          kelompokId: kid,
          code,
          gender: 'L',
          snapByKK,
          masterByKK,
          derivedByKK,
        }),
      0
    )
    const p = kelompokIds.reduce(
      (sum, kid) =>
        sum +
        getSensusCellCount({
          kelompokId: kid,
          code,
          gender: 'P',
          snapByKK,
          masterByKK,
          derivedByKK,
        }),
      0
    )
    const total = perKK.reduce((a, b) => a + b, 0)
    return { code, label: CATEGORY_LABELS[code], perKK, l, p, total }
  })

  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const generusTotal = rows
    .filter((row) => row.code !== 'PENDIDIK_MT' && row.code !== 'PENDIDIK_MS')
    .reduce((sum, row) => sum + row.total, 0)
  const pendidikTotal = total - generusTotal

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Sensus Generus</CardTitle>
        <CardDescription>
          Snapshot saat submit, dilengkapi master berjalan untuk data yang belum
          tersnapshot.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {total === 0 ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            Tidak ada snapshot sensus.
          </div>
        ) : (
          <>
            <SensusGenderChart
              rows={rows.map((row) => ({
                code: row.code,
                label: row.label,
                L: row.l,
                P: row.p,
                total: row.total,
              }))}
              kelompokCount={kelompokList.length}
              total={total}
              generusTotal={generusTotal}
              pendidikTotal={pendidikTotal}
            />
            <div className='overflow-x-auto'>
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
                  {rows.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className='font-medium'>{row.label}</TableCell>
                      {row.perKK.map((n, i) => (
                        <TableCell
                          key={kelompokIds[i]}
                          className={cn(
                            'text-right tabular-nums',
                            n === 0 && 'text-muted-foreground/60'
                          )}
                        >
                          {n || '—'}
                        </TableCell>
                      ))}
                      <TableCell className='text-right font-semibold tabular-nums'>
                        {row.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function makeSensusCellKey(
  kelompokId: string,
  categoryCode: string,
  gender: string
) {
  return `${kelompokId}__${categoryCode}__${gender}`
}

function getSensusCellCount({
  kelompokId,
  code,
  gender,
  snapByKK,
  masterByKK,
  derivedByKK,
}: {
  kelompokId: string
  code: CategoryCode
  gender: SensusGender
  snapByKK: Map<string, SensusSnapshotRow>
  masterByKK: Map<string, SensusRow>
  derivedByKK: Map<string, DerivedGpnSensusRow>
}) {
  const key = makeSensusCellKey(kelompokId, code, gender)
  const snapshot = snapByKK.get(key)
  if (snapshot) return snapshot.count

  if (code === 'GPN_A' || code === 'GPN_B') {
    return derivedByKK.get(key)?.count ?? masterByKK.get(key)?.count ?? 0
  }

  return masterByKK.get(key)?.count ?? 0
}

interface SensusChartRow {
  code: CategoryCode
  label: string
  L: number
  P: number
  total: number
}

const sensusChartConfig = {
  L: { label: 'Laki-laki', color: 'var(--chart-1)' },
  P: { label: 'Perempuan', color: 'oklch(0.92 0.05 90)' },
} satisfies ChartConfig

function formatRecapNumber(value: number): string {
  return value.toLocaleString('id-ID')
}

function formatSegmentLabel(value: unknown): string {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) && numberValue > 0
    ? formatRecapNumber(numberValue)
    : ''
}

function GenderLegend() {
  return (
    <div className='flex items-center justify-center gap-4 text-xs text-muted-foreground'>
      <span className='inline-flex items-center gap-1.5'>
        <span className='h-2.5 w-2.5 rounded-sm bg-chart-1' />
        Laki-laki
      </span>
      <span className='inline-flex items-center gap-1.5'>
        <span className='h-2.5 w-2.5 rounded-sm border border-border/40 bg-[oklch(0.92_0.05_90)]' />
        Perempuan
      </span>
    </div>
  )
}

function SensusGenderChart({
  rows,
  kelompokCount,
  total,
  generusTotal,
  pendidikTotal,
}: {
  rows: SensusChartRow[]
  kelompokCount: number
  total: number
  generusTotal: number
  pendidikTotal: number
}) {
  const chartRows = useMemo(() => {
    const rawRows = rows.map((row) => {
      let shortLabel = row.label
      if (row.code === 'GPN_A') shortLabel = 'GPN A'
      if (row.code === 'GPN_B') shortLabel = 'GPN B'
      return {
        ...row,
        shortLabel,
      }
    })

    const nonPendidik = rawRows.filter(
      (r) => r.code !== 'PENDIDIK_MT' && r.code !== 'PENDIDIK_MS'
    )
    const pendidik = rawRows.filter(
      (r) => r.code === 'PENDIDIK_MT' || r.code === 'PENDIDIK_MS'
    )

    nonPendidik.sort((a, b) => b.total - a.total)
    pendidik.sort((a, b) => b.total - a.total)

    return [...nonPendidik, ...pendidik]
  }, [rows])

  const renderTotalLabel = (props: {
    x?: string | number
    y?: string | number
    width?: string | number
    index?: number
  }) => {
    const { x, y, width, index } = props
    if (x == null || y == null || width == null || index == null) return null
    const numX = typeof x === 'string' ? parseFloat(x) : x
    const numY = typeof y === 'string' ? parseFloat(y) : y
    const numWidth = typeof width === 'string' ? parseFloat(width) : width
    const data = chartRows[index]
    if (!data || data.total === 0) return null
    return (
      <text
        x={numX + numWidth / 2}
        y={numY - 8}
        fill='var(--foreground)'
        fontSize={11}
        fontWeight={700}
        textAnchor='middle'
        className='tabular-nums'
      >
        {formatRecapNumber(data.total)}
      </text>
    )
  }

  const lakiTotal = chartRows.reduce((sum, row) => sum + row.L, 0)
  const perempuanTotal = chartRows.reduce((sum, row) => sum + row.P, 0)

  return (
    <div className='flex flex-col gap-6'>
      {/* 5 Summary Cards Grid */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        <SummaryTile label='Generus' value={generusTotal} />
        <SummaryTile label='Pendidik' value={pendidikTotal} />
        <SummaryTile label='Laki-laki' value={lakiTotal} />
        <SummaryTile label='Perempuan' value={perempuanTotal} />
        <SummaryTile
          label='Kelompok'
          value={kelompokCount}
          className='col-span-2 sm:col-span-1'
        />
      </div>

      {/* Chart Card */}
      <div className='rounded-lg border border-border/70 bg-card p-6 shadow-sm'>
        <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h3 className='text-lg font-bold tracking-tight text-foreground'>
              Komposisi Sensus Desa
            </h3>
            <p className='text-sm text-muted-foreground'>
              Snapshot gabungan {kelompokCount} kelompok, dipisah laki-laki dan
              perempuan.
            </p>
          </div>
          <div className='text-right'>
            <div className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
              Total
            </div>
            <div className='mt-1 text-3xl font-extrabold tracking-tight text-foreground tabular-nums'>
              {formatRecapNumber(total)}
            </div>
          </div>
        </div>
        <div className='flex flex-col gap-4'>
          <ChartContainer
            config={sensusChartConfig}
            className='aspect-auto h-72 w-full'
          >
            <BarChart
              accessibilityLayer
              data={chartRows}
              margin={{ top: 20, right: 16, bottom: 8, left: 18 }}
            >
              <CartesianGrid
                vertical={false}
                stroke='var(--border)'
                strokeOpacity={0.4}
                strokeDasharray='4 4'
              />
              <XAxis
                dataKey='shortLabel'
                type='category'
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'var(--muted-foreground)',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <YAxis
                type='number'
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => formatRecapNumber(value)}
                tick={{
                  fill: 'var(--muted-foreground)',
                  fontSize: 11,
                  fontWeight: 400,
                }}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', fillOpacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as SensusChartRow
                  return (
                    <div className='min-w-35 rounded-lg border border-border/80 bg-popover/95 p-3 text-xs text-popover-foreground shadow-lg backdrop-blur-sm'>
                      <div className='mb-2 border-b border-border/50 pb-1.5 font-bold text-foreground'>
                        {row.label}
                      </div>
                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between gap-4'>
                          <span className='flex items-center gap-1.5 text-muted-foreground'>
                            <span className='h-2 w-2 rounded-full bg-chart-1' />
                            Laki-laki
                          </span>
                          <span className='font-mono font-medium text-foreground tabular-nums'>
                            {formatRecapNumber(row.L)}
                          </span>
                        </div>
                        <div className='flex items-center justify-between gap-4'>
                          <span className='flex items-center gap-1.5 text-muted-foreground'>
                            <span className='h-2 w-2 rounded-full bg-[oklch(0.92_0.05_90)]' />
                            Perempuan
                          </span>
                          <span className='font-mono font-medium text-foreground tabular-nums'>
                            {formatRecapNumber(row.P)}
                          </span>
                        </div>
                        <div className='mt-1.5 flex items-center justify-between gap-4 border-t pt-1.5 font-extrabold text-foreground'>
                          <span>Total</span>
                          <span className='font-mono tabular-nums'>
                            {formatRecapNumber(row.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey='L'
                stackId='gender'
                fill='var(--color-L)'
                stroke='var(--background)'
                strokeWidth={2}
                radius={[0, 0, 0, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey='L'
                  position='center'
                  className='fill-white font-semibold'
                  fontSize={11}
                  formatter={formatSegmentLabel}
                />
              </Bar>
              <Bar
                dataKey='P'
                stackId='gender'
                fill='var(--color-P)'
                stroke='var(--background)'
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey='P'
                  position='center'
                  className='fill-foreground font-semibold'
                  fontSize={11}
                  formatter={formatSegmentLabel}
                />
                <LabelList dataKey='P' content={renderTotalLabel} />
              </Bar>
            </BarChart>
          </ChartContainer>
          <GenderLegend />
        </div>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:border-border',
        className
      )}
    >
      <span className='text-sm font-medium text-muted-foreground'>{label}</span>
      <span className='text-2xl font-bold text-foreground tabular-nums'>
        {formatRecapNumber(value)}
      </span>
    </div>
  )
}

interface MetricDefLite {
  code: string
  name: string
  value_format: string
  category_label: string | null
}

function formatMetricAverage(value: number): string {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })
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
          <div className='text-sm text-muted-foreground'>
            Tidak ada metric aktif.
          </div>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className='mb-2 text-sm font-semibold text-muted-foreground'>
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
                      <TableHead className='text-right'>Rata-rata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((m) => {
                      const suffix = m.value_format === 'percent' ? '%' : ''
                      const values = kelompokList.map((k) => {
                        const report = reportByKelompok.get(k.id)
                        const row = report
                          ? byKey.get(`${report.id}_${m.code}`)
                          : undefined
                        return row?.current_value ?? null
                      })
                      const validValues = values.filter(
                        (value): value is number => value != null
                      )
                      const average =
                        validValues.length > 0
                          ? validValues.reduce((sum, value) => sum + value, 0) /
                            validValues.length
                          : null

                      return (
                        <TableRow key={m.code}>
                          <TableCell className='font-medium'>
                            {m.name}
                          </TableCell>
                          {values.map((val, index) => (
                            <TableCell
                              key={kelompokList[index]?.id}
                              className={cn(
                                'text-right tabular-nums',
                                val == null && 'text-muted-foreground/60'
                              )}
                            >
                              {val != null ? `${val}${suffix}` : '—'}
                            </TableCell>
                          ))}
                          <TableCell
                            className={cn(
                              'text-right font-semibold tabular-nums',
                              average == null && 'text-muted-foreground/60'
                            )}
                          >
                            {average != null
                              ? `${formatMetricAverage(average)}${suffix}`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
        <CardDescription>Berdasarkan {totalItems} item aktif.</CardDescription>
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
                  <div
                    className='h-1.5 w-full overflow-hidden rounded-full bg-muted/70'
                    role='progressbar'
                    aria-valuenow={e.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${e.k.value}: ${e.pct}% pengadaan`}
                  >
                    <div
                      className='h-full rounded-full bg-foreground/85 transition-[width] duration-500 ease-out'
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
            <TableRow className='bg-muted/40 font-semibold hover:bg-muted/40'>
              <TableCell className='text-[0.6875rem] tracking-[0.12em] uppercase'>
                Total
              </TableCell>
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
      const ta = a.template_code
        ? templateByCode.get(a.template_code)
        : undefined
      const tb = b.template_code
        ? templateByCode.get(b.template_code)
        : undefined
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
        <div className='flex flex-col gap-7'>
          {kelompokList.map((k) => {
            const report = reportByKelompok.get(k.id)
            const kkRows = report
              ? sortNotes(rows.filter((r) => r.monthly_report_id === report.id))
              : []
            return (
              <div key={k.id} className='flex flex-col gap-3'>
                <div className='flex items-baseline justify-between gap-3'>
                  <h3 className='font-semibold tracking-tight'>{k.value}</h3>
                  <span className='text-xs text-muted-foreground tabular-nums'>
                    {kkRows.length} item
                  </span>
                </div>
                {kkRows.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    Tidak ada catatan.
                  </p>
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
                      const showStatusBadge = !tmpl || n.status !== 'open'
                      return (
                        <div
                          key={n.id}
                          className='rounded-md border border-border/60 bg-muted/20 p-3.5 text-sm'
                        >
                          {(showStatusBadge || n.deadline || n.pic) && (
                            <div className='mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1'>
                              {showStatusBadge && (
                                <span className='inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-xs font-medium'>
                                  {
                                    MUSTIN_STATUS_LABELS[
                                      n.status as MustinStatus
                                    ]
                                  }
                                </span>
                              )}
                              {n.deadline && (
                                <span className='text-xs text-muted-foreground tabular-nums'>
                                  Deadline{' '}
                                  {format(parseISO(n.deadline), 'dd MMM yyyy', {
                                    locale: idLocale,
                                  })}
                                </span>
                              )}
                              {n.pic && (
                                <span className='text-xs text-muted-foreground'>
                                  PIC {n.pic}
                                </span>
                              )}
                            </div>
                          )}
                          <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
                            <div>
                              <div className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground/90 uppercase'>
                                Pokok Masalah
                              </div>
                              <div className='mt-1 font-medium whitespace-pre-wrap'>
                                {n.pokok_masalah}
                              </div>
                              {subs.length > 0 && (
                                <ol className='mt-1.5 list-[lower-alpha] pl-5 text-xs leading-relaxed text-muted-foreground'>
                                  {subs.map((s) => (
                                    <li key={s}>{s}</li>
                                  ))}
                                </ol>
                              )}
                            </div>
                            <div>
                              <div className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground/90 uppercase'>
                                Keputusan / Rencana
                              </div>
                              <div className='mt-1 leading-relaxed whitespace-pre-wrap'>
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
