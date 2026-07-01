import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { id as idLocale } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
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
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { KelompokSelector } from '../components/kelompok-selector'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  DERIVED_SENSUS_CATEGORIES,
  type CategoryCode,
} from '../constants'
import {
  useDerivedGpnSensus,
  useDerivedGpnSensusForKelompoks,
  useSensus,
  useSensusForKelompoks,
  useUpsertSensusCell,
} from '../hooks/use-lupg-queries'
import { type DerivedGpnSensusRow, type SensusGender } from '../types'
import { SensusCardList } from './components/sensus-card-list'

const DESA_SELECTION = 'desa'

export function SensusMaster() {
  const { role, kelompok } = useAuthStore((s) => s.auth)
  const isTeamManager = role === 'team_manager'

  const { data: kelompokOptions = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return data as { id: string; value: string }[]
    },
  })

  const [adminKelompokId, setAdminKelompokId] = useState<string>(DESA_SELECTION)
  const isDesaMode = !isTeamManager && adminKelompokId === DESA_SELECTION
  const kelompokIds = useMemo(
    () => kelompokOptions.map((option) => option.id),
    [kelompokOptions]
  )
  const resolvedKelompokId: string | undefined = isTeamManager
    ? kelompokOptions.find((o) => o.value === kelompok)?.id
    : isDesaMode
      ? undefined
      : adminKelompokId

  const { data: rows = [], isLoading } = useSensus(resolvedKelompokId)
  const { data: derivedRaw = [] } = useDerivedGpnSensus(resolvedKelompokId)
  const { data: desaRows = [], isLoading: isDesaRowsLoading } =
    useSensusForKelompoks(isDesaMode ? kelompokIds : [])
  const { data: desaDerivedRaw = [], isLoading: isDesaDerivedLoading } =
    useDerivedGpnSensusForKelompoks(isDesaMode ? kelompokIds : [])

  const effectiveRows = isDesaMode ? desaRows : rows
  const effectiveDerivedRaw = isDesaMode ? desaDerivedRaw : derivedRaw
  const effectiveIsLoading = isDesaMode
    ? isDesaRowsLoading || isDesaDerivedLoading
    : isLoading

  const latestUpdatedAt = useMemo(() => {
    if (effectiveRows.length === 0) return null
    const timestamps = effectiveRows
      .map((r) => r.last_updated_at)
      .filter((t): t is string => typeof t === 'string')
    if (timestamps.length === 0) return null
    const sorted = timestamps.sort()
    return sorted[sorted.length - 1] ?? null
  }, [effectiveRows])

  const byCell = useMemo(() => {
    const cell: Record<string, number> = {}
    for (const r of effectiveRows) {
      const key = `${r.category_code}_${r.gender}`
      cell[key] = (cell[key] ?? 0) + r.count
    }
    return cell
  }, [effectiveRows])

  const derivedByKey = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of effectiveDerivedRaw as DerivedGpnSensusRow[]) {
      const key = `${d.category_code}__${d.gender}`
      m.set(key, (m.get(key) ?? 0) + d.count)
    }
    return m
  }, [effectiveDerivedRaw])

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <PageHeader
          kicker='LUPG · Sensus'
          title='Sensus Generus'
          description='Data master peserta per kategori × gender. Update saat ada perubahan.'
          actions={
            !isTeamManager ? (
              <KelompokSelector
                value={adminKelompokId}
                onChange={setAdminKelompokId}
                allOption={{ value: DESA_SELECTION, label: 'Rekap Desa' }}
              />
            ) : null
          }
        />

        {!isDesaMode && !resolvedKelompokId ? (
          <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
            Pilih kelompok untuk mulai input.
          </div>
        ) : effectiveIsLoading ? (
          <div className='flex items-center justify-center py-16 text-muted-foreground'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat sensus...
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border/60 pb-3'>
              <div className='flex items-baseline gap-1.5'>
                <span className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
                  Periode
                </span>
                <span className='text-sm font-semibold'>
                  {format(new Date(), 'MMMM yyyy', { locale: idLocale })}
                </span>
                <span className='text-xs text-muted-foreground'>
                  (berjalan)
                </span>
              </div>
              <div className='flex items-baseline gap-1.5'>
                <span className='text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
                  Diperbarui
                </span>
                <span className='text-sm tabular-nums'>
                  {latestUpdatedAt
                    ? format(parseISO(latestUpdatedAt), 'dd MMM yyyy, HH:mm', {
                        locale: idLocale,
                      })
                    : 'Belum ada'}
                </span>
              </div>
              <div className='ms-auto max-w-[48ch] text-xs text-muted-foreground'>
                {isDesaMode
                  ? `Rekap desa menjumlahkan ${kelompokIds.length} kelompok dan bersifat baca saja. Pilih kelompok untuk mengedit angka manual.`
                  : 'Sensus adalah data master yang selalu mencerminkan keadaan saat ini. Snapshot per bulan otomatis dibuat saat laporan bulanan dikirim.'}
              </div>
            </div>
            {isDesaMode && (
              <SensusDesaChart
                byCell={byCell}
                derivedByKey={derivedByKey}
                kelompokCount={kelompokIds.length}
              />
            )}
            <div className='hidden md:block'>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead>Kategori</TableHead>
                      <TableHead className='text-right'>L</TableHead>
                      <TableHead className='text-right'>P</TableHead>
                      <TableHead className='text-right'>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CATEGORY_CODES.map((code) => {
                      const isDerived = DERIVED_SENSUS_CATEGORIES.has(code)
                      const l = isDerived
                        ? (derivedByKey.get(`${code}__L`) ?? 0)
                        : (byCell[`${code}_L`] ?? 0)
                      const p = isDerived
                        ? (derivedByKey.get(`${code}__P`) ?? 0)
                        : (byCell[`${code}_P`] ?? 0)
                      const isReadOnly = isDesaMode || isDerived
                      return (
                        <TableRow
                          key={code}
                          className={cn(
                            isDerived && 'bg-muted/40 hover:bg-muted/40'
                          )}
                        >
                          <TableCell className='font-medium'>
                            {CATEGORY_LABELS[code]}
                            {isDerived && (
                              <span className='ms-2 text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
                                Otomatis
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            {isReadOnly || !resolvedKelompokId ? (
                              <DerivedCell count={l} />
                            ) : (
                              <SensusCell
                                kelompokId={resolvedKelompokId}
                                categoryCode={code}
                                gender='L'
                                initial={l}
                              />
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            {isReadOnly || !resolvedKelompokId ? (
                              <DerivedCell count={p} />
                            ) : (
                              <SensusCell
                                kelompokId={resolvedKelompokId}
                                categoryCode={code}
                                gender='P'
                                initial={p}
                              />
                            )}
                          </TableCell>
                          <TableCell className='text-right font-semibold tabular-nums'>
                            {l + p}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className='md:hidden'>
              <SensusCardList
                kelompokId={resolvedKelompokId}
                byCell={byCell}
                derivedByKey={derivedByKey}
                readOnly={isDesaMode}
              />
            </div>
          </>
        )}
      </Main>
    </>
  )
}

interface ChartRow {
  code: CategoryCode
  label: string
  shortLabel: string
  L: number
  P: number
  total: number
}

const sensusChartConfig = {
  L: { label: 'Laki-laki', color: 'var(--chart-1)' },
  P: { label: 'Perempuan', color: 'oklch(0.92 0.05 90)' },
} satisfies ChartConfig

function formatNumber(value: number): string {
  return value.toLocaleString('id-ID')
}

function SensusDesaChart({
  byCell,
  derivedByKey,
  kelompokCount,
}: {
  byCell: Record<string, number>
  derivedByKey: Map<string, number>
  kelompokCount: number
}) {
  const chartRows = useMemo(() => {
    const rawRows = CATEGORY_CODES.map((code) => {
      const isDerived = DERIVED_SENSUS_CATEGORIES.has(code)
      const l = isDerived
        ? (derivedByKey.get(`${code}__L`) ?? 0)
        : (byCell[`${code}_L`] ?? 0)
      const p = isDerived
        ? (derivedByKey.get(`${code}__P`) ?? 0)
        : (byCell[`${code}_P`] ?? 0)
      let shortLabel = CATEGORY_LABELS[code]
      if (code === 'GPN_A') shortLabel = 'GPN A'
      if (code === 'GPN_B') shortLabel = 'GPN B'
      return {
        code,
        label: CATEGORY_LABELS[code],
        shortLabel,
        L: l,
        P: p,
        total: l + p,
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
  }, [byCell, derivedByKey])

  const total = chartRows.reduce((sum, row) => sum + row.total, 0)
  const generusTotal = chartRows
    .filter((row) => row.code !== 'PENDIDIK_MT' && row.code !== 'PENDIDIK_MS')
    .reduce((sum, row) => sum + row.total, 0)
  const pendidikTotal = total - generusTotal
  const lakiTotal = chartRows.reduce((sum, row) => sum + row.L, 0)
  const perempuanTotal = chartRows.reduce((sum, row) => sum + row.P, 0)
  const hasData = total > 0

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
        {formatNumber(data.total)}
      </text>
    )
  }

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
            <h2 className='text-lg font-bold tracking-tight text-foreground'>
              Komposisi Sensus Desa
            </h2>
            <p className='text-sm text-muted-foreground'>
              Gabungan {kelompokCount} kelompok, dipisah laki-laki dan
              perempuan.
            </p>
          </div>
          <div className='text-right'>
            <div className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
              Total Sensus
            </div>
            <div className='mt-1 text-3xl font-extrabold tracking-tight text-foreground tabular-nums'>
              {formatNumber(total)}
            </div>
          </div>
        </div>
        {!hasData ? (
          <div className='flex h-72 items-center justify-center text-sm text-muted-foreground'>
            Belum ada data sensus desa.
          </div>
        ) : (
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
                  tickFormatter={(value: number) => formatNumber(value)}
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
                    const row = payload[0].payload as ChartRow
                    return (
                      <div className='min-w-[140px] rounded-lg border border-border/80 bg-popover/95 p-3 text-xs text-popover-foreground shadow-lg backdrop-blur-sm'>
                        <div className='mb-2 border-b border-border/50 pb-1.5 font-bold text-foreground'>
                          {row.label}
                        </div>
                        <div className='space-y-1.5'>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='flex items-center gap-1.5 text-muted-foreground'>
                              <span className='h-2 w-2 rounded-full bg-[var(--chart-1)]' />
                              Laki-laki
                            </span>
                            <span className='font-mono font-medium text-foreground tabular-nums'>
                              {formatNumber(row.L)}
                            </span>
                          </div>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='flex items-center gap-1.5 text-muted-foreground'>
                              <span className='h-2 w-2 rounded-full bg-[oklch(0.92_0.05_90)]' />
                              Perempuan
                            </span>
                            <span className='font-mono font-medium text-foreground tabular-nums'>
                              {formatNumber(row.P)}
                            </span>
                          </div>
                          <div className='mt-1.5 flex items-center justify-between gap-4 border-t pt-1.5 font-extrabold text-foreground'>
                            <span>Total</span>
                            <span className='font-mono tabular-nums'>
                              {formatNumber(row.total)}
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
        )}
      </div>
    </div>
  )
}

function formatSegmentLabel(value: unknown): string {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) && numberValue > 0
    ? formatNumber(numberValue)
    : ''
}

function GenderLegend() {
  return (
    <div className='flex items-center justify-center gap-4 text-xs text-muted-foreground'>
      <span className='inline-flex items-center gap-1.5'>
        <span className='h-2.5 w-2.5 rounded-sm bg-[var(--chart-1)]' />
        Laki-laki
      </span>
      <span className='inline-flex items-center gap-1.5'>
        <span className='h-2.5 w-2.5 rounded-sm border border-border/40 bg-[oklch(0.92_0.05_90)]' />
        Perempuan
      </span>
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
        'flex items-center justify-between rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:border-border/100',
        className
      )}
    >
      <span className='text-sm font-medium text-muted-foreground'>{label}</span>
      <span className='text-2xl font-bold text-foreground tabular-nums'>
        {formatNumber(value)}
      </span>
    </div>
  )
}

interface CellProps {
  kelompokId: string
  categoryCode: CategoryCode
  gender: SensusGender
  initial: number
}

function DerivedCell({ count }: { count: number }) {
  return (
    <div className='flex flex-col items-end gap-0.5'>
      <div className='text-base font-semibold tabular-nums'>{count}</div>
    </div>
  )
}

function SensusCell({ kelompokId, categoryCode, gender, initial }: CellProps) {
  const [value, setValue] = useState(initial.toString())
  const upsert = useUpsertSensusCell()

  useEffect(() => {
    setValue(initial.toString())
  }, [initial])

  const save = () => {
    if (DERIVED_SENSUS_CATEGORIES.has(categoryCode)) return
    const n = parseInt(value, 10)
    if (isNaN(n) || n < 0) {
      setValue(initial.toString())
      return
    }
    if (n === initial) return
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        category_code: categoryCode,
        gender,
        count: n,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
          setValue(initial.toString())
        },
      }
    )
  }

  return (
    <Input
      type='number'
      min={0}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      className='ms-auto w-20 text-right tabular-nums'
      inputMode='numeric'
    />
  )
}
