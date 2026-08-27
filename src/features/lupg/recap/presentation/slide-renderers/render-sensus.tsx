// Sensus slide renderer — kelompok mode (pie + sub-tables) and desa mode (stacked bar + table).
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
  effectiveKelompokList: { id: string; value: string }[]
  byKey: Map<string, SensusCellRow>
}

function SensusDesaBody({ effectiveKelompokList, byKey }: SensusDesaBodyProps) {
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

  const colSums = GENERUS_DISPLAY_ORDER.reduce(
    (acc, code) => {
      acc[code] = sorted.reduce((s, e) => s + e.summary.generus[code].total, 0)
      return acc
    },
    {} as Record<GenerusCode, number>
  )
  const grandTotal = sorted.reduce((s, e) => s + e.summary.generusTotal, 0)
  const totalPendidik = sorted.reduce((s, e) => s + e.summary.pendidikTotal, 0)

  return (
    <div className='grid h-full min-h-0 grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-10'>
      <section className='flex min-h-0 flex-col'>
        <div className='min-h-0'>
          <EditorialTable density='compact' headerVariant='hairline'>
            <EditorialTableHeader>
              <EditorialTableRow>
                <EditorialTableHead>Kelompok</EditorialTableHead>
                {GENERUS_DISPLAY_ORDER.map((code) => (
                  <EditorialTableHead key={code} className='text-right'>
                    {GENERUS_LABELS[code]}
                  </EditorialTableHead>
                ))}
                <EditorialTableHead className='text-right'>
                  Total
                </EditorialTableHead>
              </EditorialTableRow>
            </EditorialTableHeader>
            <EditorialTableBody>
              {sorted.map((entry) => (
                <EditorialTableRow key={entry.kelompok}>
                  <EditorialTableCell>{entry.kelompok}</EditorialTableCell>
                  {GENERUS_DISPLAY_ORDER.map((code) => (
                    <EditorialTableCell key={code} className='text-right'>
                      {entry.summary.generus[code].total}
                    </EditorialTableCell>
                  ))}
                  <EditorialTableCell className='text-right font-semibold'>
                    {entry.summary.generusTotal}
                  </EditorialTableCell>
                </EditorialTableRow>
              ))}
              <TotalRow>
                <EditorialTableCell>Total Desa</EditorialTableCell>
                {GENERUS_DISPLAY_ORDER.map((code) => (
                  <EditorialTableCell key={code} className='text-right'>
                    {colSums[code]}
                  </EditorialTableCell>
                ))}
                <EditorialTableCell className='text-right'>
                  {grandTotal}
                </EditorialTableCell>
              </TotalRow>
            </EditorialTableBody>
          </EditorialTable>

          <RatioPill
            label='Perbandingan pendidik : Generus Desa'
            ratioRight={ratioLabel(grandTotal, totalPendidik)}
          />
        </div>
      </section>
      <section className='min-h-0 overflow-hidden'>
        <SensusStackedBar data={stackedData} />
      </section>
    </div>
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
      const title = isKelompokMode
        ? 'Sensus Generus & Pendidik'
        : 'Sensus Generus per Kelompok'

      return (
        <SlideFrame
          eyebrow='SENSUS'
          title={title}
          meta={monthLabel}
          scope={scope}
          slideNumber={slideNumber}
          totalSlides={totalSlides}
        >
          {isKelompokMode ? (
            <SensusKelompokBody
              perKelompok={buildPerKelompok(effectiveKelompokList[0].id, byKey)}
            />
          ) : (
            <SensusDesaBody
              effectiveKelompokList={effectiveKelompokList}
              byKey={byKey}
            />
          )}
        </SlideFrame>
      )
    },
  }
}
