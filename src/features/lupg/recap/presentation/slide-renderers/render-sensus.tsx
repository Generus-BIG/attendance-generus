import { useState, type KeyboardEvent } from 'react'
import { m } from 'framer-motion'
import { BarChart2, Table as TableIcon } from 'lucide-react'
import { TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type SensusCellRow } from '../../../types'
import { SensusPie, type SensusPieDatum } from '../charts/sensus-pie'
import {
  SensusStackedBar,
  type SensusStackedBarDatum,
} from '../charts/sensus-stacked-bar'
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
import { ReportSplit } from '../components/report-split'
import { SlideFrame } from '../components/slide-frame'
import { usePresentationAnimation } from '../context/animation-context'
import { type Slide } from '../slides'
import { usePresPalette } from '../use-pres-palette'

type GenerusCode = 'GPN_A' | 'GPN_B' | 'AR' | 'APR' | 'ACR'

// Display order top-to-bottom: youngest → oldest (ACR → GPN B).
const GENERUS_DISPLAY_ORDER: GenerusCode[] = [
  'ACR',
  'APR',
  'AR',
  'GPN_A',
  'GPN_B',
]
const GENERUS_LABELS: Record<GenerusCode, string> = {
  GPN_A: 'GPN A',
  GPN_B: 'GPN B',
  AR: 'AR',
  APR: 'APR',
  ACR: 'ACR',
}

interface KelompokSummary {
  L: number
  P: number
  total: number
}

interface PerKelompokSensus {
  generus: Record<GenerusCode, KelompokSummary>
  pendidikMT: KelompokSummary
  pendidikMS: KelompokSummary
  generusTotal: number
  pendidikTotal: number
}

function emptyPerKelompokSensus(): PerKelompokSensus {
  const generus = GENERUS_DISPLAY_ORDER.reduce(
    (acc, code) => {
      acc[code] = { L: 0, P: 0, total: 0 }
      return acc
    },
    {} as Record<GenerusCode, KelompokSummary>
  )
  return {
    generus,
    pendidikMT: { L: 0, P: 0, total: 0 },
    pendidikMS: { L: 0, P: 0, total: 0 },
    generusTotal: 0,
    pendidikTotal: 0,
  }
}

function buildPerKelompok(
  kelompokId: string,
  byKey: Map<string, SensusCellRow>
): PerKelompokSensus {
  const result = emptyPerKelompokSensus()
  for (const code of GENERUS_DISPLAY_ORDER) {
    const l = byKey.get(`${kelompokId}_${code}_L`)?.count ?? 0
    const p = byKey.get(`${kelompokId}_${code}_P`)?.count ?? 0
    result.generus[code] = { L: l, P: p, total: l + p }
    result.generusTotal += l + p
  }
  const mtL = byKey.get(`${kelompokId}_PENDIDIK_MT_L`)?.count ?? 0
  const mtP = byKey.get(`${kelompokId}_PENDIDIK_MT_P`)?.count ?? 0
  const msL = byKey.get(`${kelompokId}_PENDIDIK_MS_L`)?.count ?? 0
  const msP = byKey.get(`${kelompokId}_PENDIDIK_MS_P`)?.count ?? 0
  result.pendidikMT = { L: mtL, P: mtP, total: mtL + mtP }
  result.pendidikMS = { L: msL, P: msP, total: msL + msP }
  result.pendidikTotal = result.pendidikMT.total + result.pendidikMS.total
  return result
}

function ratioLabel(generusTotal: number, pendidikTotal: number): string {
  if (pendidikTotal <= 0) return '—'
  const n = Math.round(generusTotal / pendidikTotal)
  return String(n)
}

interface RatioPillProps {
  label: string
  ratioRight: string
}

function RatioPill({ label, ratioRight }: RatioPillProps) {
  const p = usePresPalette()
  return (
    <p
      className='mt-5 whitespace-nowrap'
      style={{
        fontFamily: p.fontSans,
        fontSize: 'clamp(0.75rem, 0.9cqw, 1rem)',
        color: p.muted,
      }}
    >
      {label} 1 : {ratioRight}
    </p>
  )
}

interface SensusKelompokBodyProps {
  perKelompok: PerKelompokSensus
}

function SensusKelompokBody({ perKelompok }: SensusKelompokBodyProps) {
  const totalL = GENERUS_DISPLAY_ORDER.reduce(
    (acc, code) => acc + perKelompok.generus[code].L,
    0
  )
  const totalP = GENERUS_DISPLAY_ORDER.reduce(
    (acc, code) => acc + perKelompok.generus[code].P,
    0
  )
  const totalAll = totalL + totalP

  const pendidikL = perKelompok.pendidikMT.L + perKelompok.pendidikMS.L
  const pendidikP = perKelompok.pendidikMT.P + perKelompok.pendidikMS.P
  const pendidikTotal =
    perKelompok.pendidikMT.total + perKelompok.pendidikMS.total

  const pieData: SensusPieDatum[] = GENERUS_DISPLAY_ORDER.map((code) => ({
    code,
    label: GENERUS_LABELS[code],
    male: perKelompok.generus[code].L,
    female: perKelompok.generus[code].P,
    total: perKelompok.generus[code].total,
  }))

  return (
    <ReportSplit>
      <DataPane>
        <div className='flex flex-col gap-4'>
          <EditorialTable density='compact'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Kategori / Peran</EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  L
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  P
                </EditorialTableHead>
                <EditorialTableHead className='text-right'>
                  Jumlah
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {/* Generus Section */}
              {GENERUS_DISPLAY_ORDER.map((code) => {
                const row = perKelompok.generus[code]
                return (
                  <EditorialTableRow key={code}>
                    <EditorialTableCell>
                      {GENERUS_LABELS[code]}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {row.L}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right'>
                      {row.P}
                    </EditorialTableCell>
                    <EditorialTableCell className='text-right font-semibold'>
                      {row.total}
                    </EditorialTableCell>
                  </EditorialTableRow>
                )
              })}
              <TotalRow>
                <EditorialTableCell>Total Generus</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalL}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalP}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {totalAll}
                </EditorialTableCell>
              </TotalRow>

              {/* Spacer Row */}
              <EditorialTableRow
                style={{ background: 'transparent', height: 12 }}
              >
                <EditorialTableCell colSpan={4} className='border-none p-0' />
              </EditorialTableRow>

              {/* Pendidik Section */}
              <EditorialTableRow>
                <EditorialTableCell>Pendidik MT</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {perKelompok.pendidikMT.L}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {perKelompok.pendidikMT.P}
                </EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {perKelompok.pendidikMT.total}
                </EditorialTableCell>
              </EditorialTableRow>
              <EditorialTableRow>
                <EditorialTableCell>Pendidik MS</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {perKelompok.pendidikMS.L}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {perKelompok.pendidikMS.P}
                </EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {perKelompok.pendidikMS.total}
                </EditorialTableCell>
              </EditorialTableRow>
              <TotalRow>
                <EditorialTableCell>Total Pendidik</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {pendidikL}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {pendidikP}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {pendidikTotal}
                </EditorialTableCell>
              </TotalRow>
            </EditorialTableBody>
          </EditorialTable>

          <RatioPill
            label='PERBANDINGAN PENDIDIK : GENERUS'
            ratioRight={ratioLabel(totalAll, pendidikTotal)}
          />
        </div>
      </DataPane>
      <ChartPane>
        <SensusPie data={pieData} />
      </ChartPane>
    </ReportSplit>
  )
}

interface SensusDesaBodyProps {
  view: 'data' | 'analysis'
  effectiveKelompokList: { id: string; value: string }[]
  byKey: Map<string, SensusCellRow>
}

function SensusDesaBody({
  view,
  effectiveKelompokList,
  byKey,
}: SensusDesaBodyProps) {
  const perK = effectiveKelompokList.map((k) => ({
    kelompok: k.value,
    summary: buildPerKelompok(k.id, byKey),
  }))

  const sorted = [...perK].sort(
    (a, b) => b.summary.generusTotal - a.summary.generusTotal
  )

  const stackedData: SensusStackedBarDatum[] = sorted.map((entry) => ({
    kelompok: entry.kelompok,
    GPN_A: entry.summary.generus.GPN_A.total,
    GPN_B: entry.summary.generus.GPN_B.total,
    AR: entry.summary.generus.AR.total,
    APR: entry.summary.generus.APR.total,
    ACR: entry.summary.generus.ACR.total,
    total: entry.summary.generusTotal,
  }))

  const desaSummary = sorted.reduce((totals, { summary }) => {
    for (const code of GENERUS_DISPLAY_ORDER) {
      totals.generus[code].L += summary.generus[code].L
      totals.generus[code].P += summary.generus[code].P
      totals.generus[code].total += summary.generus[code].total
    }
    totals.pendidikMT.L += summary.pendidikMT.L
    totals.pendidikMT.P += summary.pendidikMT.P
    totals.pendidikMT.total += summary.pendidikMT.total
    totals.pendidikMS.L += summary.pendidikMS.L
    totals.pendidikMS.P += summary.pendidikMS.P
    totals.pendidikMS.total += summary.pendidikMS.total
    totals.generusTotal += summary.generusTotal
    totals.pendidikTotal += summary.pendidikTotal
    return totals
  }, emptyPerKelompokSensus())
  const grandTotal = desaSummary.generusTotal
  const totalPendidik = desaSummary.pendidikTotal

  const p = usePresPalette()
  const { reduceMotion } = usePresentationAnimation()
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

  const headerBg = p.tableHeader
  const headerFg = p.tableHeaderFg
  const totalRowBg = `color-mix(in oklch, ${p.tableHeader} 14%, transparent)`

  const fullTable = (
    <div className='flex h-full min-h-0 flex-col justify-between'>
      <div
        className='w-full flex-1 min-h-0 overflow-hidden rounded-xl'
        style={{
          border: `1px solid ${p.rule}`,
        }}
      >
        <table
          className='h-full w-full table-fixed border-collapse tabular-nums'
          style={{
            fontFamily: p.fontSans,
            borderColor: p.rule,
          }}
        >
          <colgroup>
            {/* Kelompok */}
            <col style={{ width: '9.2%' }} />
            {/* Generus (15 cols: 5 categories * 3) */}
            {Array.from({ length: 15 }).map((_, i) => (
              <col key={`gen-col-${i}`} style={{ width: '3.92%' }} />
            ))}
            {/* Total Sensus Generus - noticeably narrower */}
            <col style={{ width: '5.6%' }} />
            {/* Pendidik (6 cols: 2 categories * 3) */}
            {Array.from({ length: 6 }).map((_, i) => (
              <col key={`pen-col-${i}`} style={{ width: '4.4%' }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: '44px' }}>
              <th
                rowSpan={3}
                className='px-3 text-left font-bold tracking-wider uppercase align-middle'
                style={{
                  fontSize: 'clamp(0.82rem, 1.02cqw, 1.08rem)',
                  color: headerFg,
                  borderRight: `1px solid ${p.rule}`,
                  borderBottom: `1px solid ${p.rule}`,
                  background: headerBg,
                }}
              >
                KELOMPOK
              </th>
              <th
                colSpan={15}
                className='px-2 py-1 text-center font-bold tracking-wider uppercase align-middle'
                style={{
                  fontSize: 'clamp(0.82rem, 1.02cqw, 1.08rem)',
                  color: headerFg,
                  borderRight: `1px solid ${p.rule}`,
                  borderBottom: `1px solid ${p.rule}`,
                  background: headerBg,
                }}
              >
                KATEGORI USIA GENERUS
              </th>
              <th
                rowSpan={3}
                className='px-1 py-1 text-center font-bold uppercase align-middle'
                style={{
                  fontSize: 'clamp(0.7rem, 0.86cqw, 0.92rem)',
                  color: headerFg,
                  borderRight: `1px solid ${p.rule}`,
                  borderBottom: `1px solid ${p.rule}`,
                  background: headerBg,
                }}
              >
                <div className='flex flex-col items-center justify-center leading-[1.14] tracking-tight'>
                  <span>TOTAL</span>
                  <span>SENSUS</span>
                  <span>GENERUS</span>
                </div>
              </th>
              <th
                colSpan={6}
                className='px-2 py-1 text-center font-bold tracking-wider uppercase align-middle'
                style={{
                  fontSize: 'clamp(0.82rem, 1.02cqw, 1.08rem)',
                  color: headerFg,
                  borderBottom: `1px solid ${p.rule}`,
                  background: headerBg,
                }}
              >
                SENSUS PENDIDIK
              </th>
            </tr>
            <tr style={{ height: '36px' }}>
              {GENERUS_DISPLAY_ORDER.map((code) => (
                <th
                  key={code}
                  colSpan={3}
                  className='px-1 py-0.5 text-center font-bold tracking-wide uppercase align-middle'
                  style={{
                    fontSize: 'clamp(0.78rem, 0.96cqw, 1.02rem)',
                    color: headerFg,
                    borderRight: `1px solid ${p.rule}`,
                    borderBottom: `1px solid ${p.rule}`,
                    background: headerBg,
                  }}
                >
                  {GENERUS_LABELS[code]}
                </th>
              ))}
              <th
                colSpan={3}
                className='px-1 py-0.5 text-center font-bold tracking-wide uppercase align-middle'
                style={{
                  fontSize: 'clamp(0.78rem, 0.96cqw, 1.02rem)',
                  color: headerFg,
                  borderRight: `1px solid ${p.rule}`,
                  borderBottom: `1px solid ${p.rule}`,
                  background: headerBg,
                }}
              >
                MT
              </th>
              <th
                colSpan={3}
                className='px-1 py-0.5 text-center font-bold tracking-wide uppercase align-middle'
                style={{
                  fontSize: 'clamp(0.78rem, 0.96cqw, 1.02rem)',
                  color: headerFg,
                  borderBottom: `1px solid ${p.rule}`,
                  background: headerBg,
                }}
              >
                MS
              </th>
            </tr>
            <tr style={{ height: '32px' }}>
              {GENERUS_DISPLAY_ORDER.map((code) =>
                ['L', 'P', 'JML'].map((label) => (
                  <th
                    key={`${code}-${label}`}
                    className='px-1 py-0.5 text-center font-bold uppercase align-middle'
                    style={{
                      fontSize: 'clamp(0.72rem, 0.86cqw, 0.92rem)',
                      color: headerFg,
                      borderRight: `1px solid ${p.rule}`,
                      borderBottom: `1px solid ${p.rule}`,
                      background: headerBg,
                    }}
                  >
                    {label}
                  </th>
                ))
              )}
              {['MT', 'MS'].map((role, rIdx) =>
                ['L', 'P', 'JML'].map((label, lIdx) => {
                  const isLast = rIdx === 1 && lIdx === 2
                  return (
                    <th
                      key={`${role}-${label}`}
                      className='px-1 py-0.5 text-center font-bold uppercase align-middle'
                      style={{
                        fontSize: 'clamp(0.72rem, 0.86cqw, 0.92rem)',
                        color: headerFg,
                        borderRight: isLast ? undefined : `1px solid ${p.rule}`,
                        borderBottom: `1px solid ${p.rule}`,
                        background: headerBg,
                      }}
                    >
                      {label}
                    </th>
                  )
                })
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr
                key={entry.kelompok}
                className='transition-colors hover:bg-muted/10'
              >
                <td
                  className='px-3.5 font-medium align-middle'
                  style={{
                    fontSize: 'clamp(0.88rem, 1.08cqw, 1.08rem)',
                    color: p.ink,
                    borderRight: `1px solid ${p.rule}`,
                    borderBottom: `1px solid ${p.rule}`,
                  }}
                >
                  {entry.kelompok}
                </td>
                {GENERUS_DISPLAY_ORDER.flatMap((code) => {
                  const summary = entry.summary.generus[code]
                  return [summary.L, summary.P, summary.total].map(
                    (count, index) => (
                      <td
                        key={`${code}-${index}`}
                        className='px-1 text-center tabular-nums align-middle'
                        style={{
                          fontSize: 'clamp(0.88rem, 1.08cqw, 1.08rem)',
                          color: p.ink,
                          borderRight: `1px solid ${p.rule}`,
                          borderBottom: `1px solid ${p.rule}`,
                        }}
                      >
                        {count}
                      </td>
                    )
                  )
                })}
                <td
                  className='px-1 text-center tabular-nums font-normal align-middle'
                  style={{
                    fontSize: 'clamp(0.88rem, 1.08cqw, 1.08rem)',
                    color: p.ink,
                    borderRight: `1px solid ${p.rule}`,
                    borderBottom: `1px solid ${p.rule}`,
                  }}
                >
                  {entry.summary.generusTotal}
                </td>
                {[entry.summary.pendidikMT, entry.summary.pendidikMS].flatMap(
                  (summary, roleIndex) =>
                    [summary.L, summary.P, summary.total].map((count, index) => {
                      const isLast = roleIndex === 1 && index === 2
                      return (
                        <td
                          key={`${roleIndex}-${index}`}
                          className='px-1 text-center tabular-nums align-middle'
                          style={{
                            fontSize: 'clamp(0.88rem, 1.08cqw, 1.08rem)',
                            color: p.ink,
                            borderRight: isLast
                              ? undefined
                              : `1px solid ${p.rule}`,
                            borderBottom: `1px solid ${p.rule}`,
                          }}
                        >
                          {count}
                        </td>
                      )
                    })
                )}
              </tr>
            ))}
            <tr
              className='font-bold'
              style={{
                background: totalRowBg,
              }}
            >
              <td
                className='px-3.5 font-bold align-middle'
                style={{
                  fontSize: 'clamp(0.92rem, 1.15cqw, 1.15rem)',
                  color: p.ink,
                  borderRight: `1px solid ${p.rule}`,
                  borderBottom: 'none',
                }}
              >
                Total Desa
              </td>
              {GENERUS_DISPLAY_ORDER.flatMap((code) => {
                const summary = desaSummary.generus[code]
                return [summary.L, summary.P, summary.total].map(
                  (count, index) => (
                    <td
                      key={`${code}-${index}`}
                      className='px-1 text-center font-bold tabular-nums align-middle'
                      style={{
                        fontSize: 'clamp(0.92rem, 1.15cqw, 1.15rem)',
                        color: p.ink,
                        borderRight: `1px solid ${p.rule}`,
                        borderBottom: 'none',
                      }}
                    >
                      {count}
                    </td>
                  )
                )
              })}
              <td
                className='px-1 text-center font-bold tabular-nums align-middle'
                style={{
                  fontSize: 'clamp(0.92rem, 1.15cqw, 1.15rem)',
                  color: p.ink,
                  borderRight: `1px solid ${p.rule}`,
                  borderBottom: 'none',
                }}
              >
                {desaSummary.generusTotal}
              </td>
              {[desaSummary.pendidikMT, desaSummary.pendidikMS].flatMap(
                (summary, roleIndex) =>
                  [summary.L, summary.P, summary.total].map((count, index) => {
                    const isLast = roleIndex === 1 && index === 2
                    return (
                      <td
                        key={`${roleIndex}-${index}`}
                        className='px-1 text-center font-bold tabular-nums align-middle'
                        style={{
                          fontSize: 'clamp(0.92rem, 1.15cqw, 1.15rem)',
                          color: p.ink,
                          borderRight: isLast
                            ? undefined
                            : `1px solid ${p.rule}`,
                          borderBottom: 'none',
                        }}
                      >
                        {count}
                      </td>
                    )
                  })
              )}
            </tr>
          </tbody>
        </table>
      </div>
      <p
        className='mt-2.5 whitespace-nowrap text-left'
        style={{
          fontFamily: p.fontSans,
          fontSize: 'clamp(0.78rem, 0.92cqw, 0.98rem)',
          color: p.muted,
        }}
      >
        Perbandingan pendidik : Generus Desa 1 :{' '}
        {ratioLabel(grandTotal, totalPendidik)}
      </p>
    </div>
  )

  const compactTable = (
    <EditorialTable density='compact' headerVariant='hairline'>
      <EditorialTableHeader
        style={{
          background: headerBg,
          color: headerFg,
        }}
      >
        <EditorialTableRow>
          <EditorialTableHead style={{ color: headerFg }}>
            Kelompok
          </EditorialTableHead>
          <EditorialTableHead className='text-right' style={{ color: headerFg }}>
            Total
          </EditorialTableHead>
        </EditorialTableRow>
      </EditorialTableHeader>
      <EditorialTableBody>
        {sorted.map((entry) => (
          <TableRow key={entry.kelompok}>
            <EditorialTableCell>{entry.kelompok}</EditorialTableCell>
            <EditorialTableCell className='text-right font-semibold'>
              {entry.summary.generusTotal}
            </EditorialTableCell>
          </TableRow>
        ))}
        <TableRow
          className='font-semibold'
          style={{
            background: totalRowBg,
          }}
        >
          <EditorialTableCell>Total Desa</EditorialTableCell>
          <EditorialTableCell className='text-right'>{grandTotal}</EditorialTableCell>
        </TableRow>
      </EditorialTableBody>
    </EditorialTable>
  )

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      transition={transition}
      className='h-full min-h-0 flex-1'
    >
      {view === 'data' ? (
        <div className='h-full min-h-0'>{fullTable}</div>
      ) : (
        <div className='grid h-full min-h-0 grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] gap-6'>
          <div className='min-h-0 overflow-auto'>{compactTable}</div>
          <ChartPane>
            <SensusStackedBar data={stackedData} animationDuration={300} />
          </ChartPane>
        </div>
      )}
    </m.div>
  )
}

interface SensusDesaSlideProps {
  monthLabel: string
  scope: string
  slideNumber: number
  totalSlides: number
  effectiveKelompokList: { id: string; value: string }[]
  byKey: Map<string, SensusCellRow>
}

function SensusDesaSlide({
  monthLabel,
  scope,
  slideNumber,
  totalSlides,
  effectiveKelompokList,
  byKey,
}: SensusDesaSlideProps) {
  const [view, setView] = useState<'data' | 'analysis'>('data')
  const p = usePresPalette()
  const stopDeckKeys = (event: KeyboardEvent<HTMLDivElement>) =>
    event.stopPropagation()

  const metaNode = (
    <div className='flex items-center gap-3.5'>
      <span>{monthLabel}</span>
      <div onKeyDown={stopDeckKeys} className='flex items-center'>
        <ToggleGroup
          type='single'
          value={view}
          onValueChange={(value) => {
            if (value) setView(value as 'data' | 'analysis')
          }}
          variant='outline'
          size='sm'
          className='h-7 gap-0 rounded-lg border p-0.5'
          style={{
            borderColor: p.rule,
            background: 'transparent',
          }}
          aria-label='Tampilan sensus'
        >
          <ToggleGroupItem
            value='data'
            className='h-6 w-6 rounded-md p-0 data-[state=on]:bg-muted'
            style={{
              color: view === 'data' ? p.ink : p.muted,
            }}
            aria-label='Tampilkan tabel sensus'
          >
            <TableIcon className='h-3.5 w-3.5' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='analysis'
            className='h-6 w-6 rounded-md p-0 data-[state=on]:bg-muted'
            style={{
              color: view === 'analysis' ? p.ink : p.muted,
            }}
            aria-label='Tampilkan grafik sensus'
          >
            <BarChart2 className='h-3.5 w-3.5' />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )

  return (
    <SlideFrame
      eyebrow='SENSUS'
      title='Sensus Generus per Kelompok'
      meta={metaNode}
      scope={scope}
      slideNumber={slideNumber}
      totalSlides={totalSlides}
    >
      <SensusDesaBody
        view={view}
        effectiveKelompokList={effectiveKelompokList}
        byKey={byKey}
      />
    </SlideFrame>
  )
}

export function renderSensusSlide(args: {
  monthKey: string
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  effectiveKelompokList: { id: string; value: string }[]
  sensusCells: SensusCellRow[]
  slideNumber: number
  totalSlides: number
}): Slide {
  const {
    monthLabel,
    scope,
    isSingleKelompok,
    effectiveKelompokList,
    sensusCells,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'sensus',
    title: 'Sensus',
    render: () => {
      const byKey = new Map<string, SensusCellRow>()
      for (const s of sensusCells) {
        byKey.set(`${s.kelompok_id}_${s.category_code}_${s.gender}`, s)
      }

      const isKelompokMode =
        isSingleKelompok && effectiveKelompokList.length === 1

      if (isKelompokMode) {
        return (
          <SlideFrame
            eyebrow='SENSUS'
            title='Sensus Generus & Pendidik'
            meta={monthLabel}
            scope={scope}
            slideNumber={slideNumber}
            totalSlides={totalSlides}
          >
            <SensusKelompokBody
              perKelompok={buildPerKelompok(effectiveKelompokList[0].id, byKey)}
            />
          </SlideFrame>
        )
      }

      return (
        <SensusDesaSlide
          monthLabel={monthLabel}
          scope={scope}
          slideNumber={slideNumber}
          totalSlides={totalSlides}
          effectiveKelompokList={effectiveKelompokList}
          byKey={byKey}
        />
      )
    },
  }
}
