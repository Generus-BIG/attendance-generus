// Sarpras slide renderer — kelompok mode (item checklist + donut) and desa mode (per-kelompok stacked bar).
import { type ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import {
  type MonthlyReportRow,
  type SarprasItemRow,
  type SarprasReportRow,
} from '../../../types'
import {
  SarprasStackedBar,
  type SarprasStackedBarDatum,
} from '../charts/sarpras-stacked-bar'
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

function StatusIcon({ fulfilled }: { fulfilled: boolean }) {
  const p = usePresPalette()
  return (
    <span
      className='inline-flex size-5 items-center justify-center rounded-full'
      style={{
        background: fulfilled ? p.sarprasPrimary : p.muted,
        color: p.bg,
      }}
      aria-label={fulfilled ? 'Sudah' : 'Belum'}
    >
      {fulfilled ? (
        <Check size={13} strokeWidth={3} />
      ) : (
        <Minus size={15} strokeWidth={3} />
      )}
    </span>
  )
}

function SarprasSummary({
  fulfilled,
  total,
}: {
  fulfilled: number
  total: number
}) {
  const p = usePresPalette()
  const notFulfilled = total - fulfilled
  const pct = total > 0 ? Math.round((fulfilled / total) * 100) : 0

  return (
    <div className='flex h-full min-h-0 flex-col justify-center px-6'>
      <div className='text-center'>
        <div
          className='tabular-nums'
          style={{
            fontFamily: p.fontMono,
            fontSize: 'clamp(4rem, 6.5cqw, 7rem)',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.06em',
            color: p.sarprasPrimary,
          }}
        >
          {pct}%
        </div>
        <p
          className='mt-2'
          style={{
            fontFamily: p.fontSans,
            fontSize: 'clamp(0.9rem, 1.15cqw, 1.25rem)',
            fontWeight: 500,
            color: p.muted,
          }}
        >
          Tingkat Pengadaan
        </p>
      </div>

      <div
        className='mt-10 h-3 overflow-hidden rounded-full'
        style={{ background: `color-mix(in oklch, ${p.muted} 18%, ${p.bg})` }}
      >
        <div
          className='h-full rounded-full'
          style={{
            width: `${pct}%`,
            background: p.sarprasPrimary,
          }}
        />
      </div>

      <div
        className='mt-8 flex items-baseline justify-center gap-4 border-t pt-6'
        style={{ borderColor: p.rule, fontFamily: p.fontSans }}
      >
        <span
          className='tabular-nums'
          style={{
            fontFamily: p.fontMono,
            fontSize: 'clamp(1.25rem, 1.8cqw, 2rem)',
            fontWeight: 700,
            color: p.sarprasPrimary,
          }}
        >
          {fulfilled}
        </span>
        <span className='font-medium' style={{ color: p.ink }}>
          sudah tercukupi
        </span>
        <span aria-hidden style={{ color: p.rule }}>
          ·
        </span>
        <span
          className='tabular-nums'
          style={{ fontFamily: p.fontMono, color: p.muted }}
        >
          {notFulfilled}
        </span>
        <span className='font-medium' style={{ color: p.muted }}>
          belum
        </span>
      </div>
    </div>
  )
}

interface SarprasKelompokBodyProps {
  activeItems: SarprasItemRow[]
  fulfilledById: Map<string, boolean>
}

function SarprasKelompokBody({
  activeItems,
  fulfilledById,
}: SarprasKelompokBodyProps) {
  const totalCount = activeItems.length
  const fulfilledCount = activeItems.reduce(
    (acc, item) => acc + (fulfilledById.get(item.id) === true ? 1 : 0),
    0
  )

  return (
    <ReportSplit>
      <div className='flex h-full min-h-0 items-start pt-12'>
        <EditorialTable headerVariant='hairline' density='micro'>
          <EditorialTableHeader>
            <EditorialTableRow>
              <EditorialTableHead
                className='h-9 px-3'
                style={{ fontSize: 'clamp(0.93rem, 1.08vw, 1.17rem)' }}
              >
                Item
              </EditorialTableHead>
              <EditorialTableHead
                className='h-9 px-3 text-center'
                style={{ fontSize: 'clamp(0.93rem, 1.08vw, 1.17rem)' }}
              >
                Status
              </EditorialTableHead>
            </EditorialTableRow>
          </EditorialTableHeader>
          <EditorialTableBody>
            {activeItems.map((item) => {
              const isFulfilled = fulfilledById.get(item.id) === true
              return (
                <EditorialTableRow key={item.id}>
                  <EditorialTableCell className='leading-tight'>
                    {item.name}
                  </EditorialTableCell>
                  <EditorialTableCell className='text-center'>
                    <StatusIcon fulfilled={isFulfilled} />
                  </EditorialTableCell>
                </EditorialTableRow>
              )
            })}
          </EditorialTableBody>
        </EditorialTable>
      </div>
      <div className='h-full min-h-0'>
        <SarprasSummary fulfilled={fulfilledCount} total={totalCount} />
      </div>
    </ReportSplit>
  )
}

interface PerKelompok {
  kelompokId: string
  kelompok: string
  sudah: number
  belum: number
  total: number
  pct: number
}

interface SarprasDesaBodyProps {
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  activeItems: SarprasItemRow[]
  sarprasReports: SarprasReportRow[]
}

function SarprasDesaBody({
  effectiveKelompokList,
  reports,
  activeItems,
  sarprasReports,
}: SarprasDesaBodyProps) {
  const totalCount = activeItems.length

  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)

  const perK: PerKelompok[] = effectiveKelompokList.map((k) => {
    const report = reportByKelompok.get(k.id)
    const sudah = report
      ? sarprasReports.filter(
          (r) => r.monthly_report_id === report.id && r.is_fulfilled === true
        ).length
      : 0
    const belum = totalCount - sudah
    const pct = totalCount > 0 ? Math.round((sudah / totalCount) * 100) : 0
    return {
      kelompokId: k.id,
      kelompok: k.value,
      sudah,
      belum,
      total: totalCount,
      pct,
    }
  })

  const sumSudah = perK.reduce((a, b) => a + b.sudah, 0)
  const sumBelum = perK.reduce((a, b) => a + b.belum, 0)
  const sumTotal = perK.reduce((a, b) => a + b.total, 0)
  const avgPct = sumTotal > 0 ? Math.round((sumSudah / sumTotal) * 100) : 0

  const stackedData: SarprasStackedBarDatum[] = perK.map((p) => ({
    kelompok: p.kelompok,
    sudah: p.sudah,
    belum: p.belum,
  }))

  return (
    <ReportSplit>
      <div className='h-full min-h-0 overflow-auto'>
        <EditorialTable headerVariant='hairline' density='compact'>
          <EditorialTableHeader>
            <EditorialTableRow>
              <EditorialTableHead>Kelompok</EditorialTableHead>
              <EditorialTableHead className='text-right'>
                Sudah
              </EditorialTableHead>
              <EditorialTableHead className='text-right'>
                Belum
              </EditorialTableHead>
              <EditorialTableHead className='text-right'>
                Total
              </EditorialTableHead>
              <EditorialTableHead className='text-right'>%</EditorialTableHead>
            </EditorialTableRow>
          </EditorialTableHeader>
          <EditorialTableBody>
            {perK.map((row) => (
              <EditorialTableRow key={row.kelompokId}>
                <EditorialTableCell>{row.kelompok}</EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {row.sudah}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {row.belum}
                </EditorialTableCell>
                <EditorialTableCell className='text-right'>
                  {row.total}
                </EditorialTableCell>
                <EditorialTableCell className='text-right font-semibold'>
                  {row.pct}%
                </EditorialTableCell>
              </EditorialTableRow>
            ))}
            <TotalRow>
              <EditorialTableCell>Total Desa</EditorialTableCell>
              <EditorialTableCell className='text-right'>
                {sumSudah}
              </EditorialTableCell>
              <EditorialTableCell className='text-right'>
                {sumBelum}
              </EditorialTableCell>
              <EditorialTableCell className='text-right'>
                {sumTotal}
              </EditorialTableCell>
              <EditorialTableCell className='text-right'>
                {avgPct}%
              </EditorialTableCell>
            </TotalRow>
          </EditorialTableBody>
        </EditorialTable>
      </div>
      <ChartPane>
        <SarprasStackedBar data={stackedData} totalItems={totalCount} />
      </ChartPane>
    </ReportSplit>
  )
}

export function renderSarprasSlide(args: {
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  sarprasItems: SarprasItemRow[]
  sarprasReports: SarprasReportRow[]
  slideNumber: number
  totalSlides: number
}): Slide {
  const {
    monthLabel,
    scope,
    isSingleKelompok,
    effectiveKelompokList,
    reports,
    sarprasItems,
    sarprasReports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'sarpras',
    title: 'Sarana Prasarana',
    render: () => {
      const activeItems = [...sarprasItems]
        .filter((i) => i.active)
        .sort((a, b) => a.sort_order - b.sort_order)

      const isKelompokMode =
        isSingleKelompok && effectiveKelompokList.length === 1
      const title = isKelompokMode
        ? 'Sarana Prasarana'
        : 'Sarana Prasarana per Kelompok'

      let body: ReactNode
      if (isKelompokMode) {
        const report = reports.find(
          (r) => r.kelompok_id === effectiveKelompokList[0].id
        )
        const reportSarpras = report
          ? sarprasReports.filter((r) => r.monthly_report_id === report.id)
          : []
        const fulfilledById = new Map<string, boolean>()
        for (const r of reportSarpras) {
          fulfilledById.set(r.item_id, r.is_fulfilled === true)
        }
        body = (
          <SarprasKelompokBody
            activeItems={activeItems}
            fulfilledById={fulfilledById}
          />
        )
      } else {
        body = (
          <SarprasDesaBody
            effectiveKelompokList={effectiveKelompokList}
            reports={reports}
            activeItems={activeItems}
            sarprasReports={sarprasReports}
          />
        )
      }

      return (
        <SlideFrame
          eyebrow='SARANA PRASARANA'
          title={title}
          meta={monthLabel}
          scope={scope}
          slideNumber={slideNumber}
          totalSlides={totalSlides}
        >
          {body}
        </SlideFrame>
      )
    },
  }
}
