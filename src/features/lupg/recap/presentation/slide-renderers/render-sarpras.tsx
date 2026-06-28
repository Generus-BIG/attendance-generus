// Sarpras slide renderer — kelompok mode (item checklist + donut) and desa mode (per-kelompok stacked bar).
import { type ReactNode } from 'react'
import {
  type MonthlyReportRow,
  type SarprasItemRow,
  type SarprasReportRow,
} from '../../../types'
import { SarprasDonut } from '../charts/sarpras-donut'
import {
  SarprasStackedBar,
  type SarprasStackedBarDatum,
} from '../charts/sarpras-stacked-bar'
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
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette } from '../use-pres-palette'

function StatusIcon({ fulfilled }: { fulfilled: boolean }) {
  const p = usePresPalette()
  const style = {
    color: fulfilled ? p.brandAccent : p.muted,
    fontFamily: p.fontSans,
    fontSize: 'clamp(0.82rem, 1vw, 1.1rem)',
    fontWeight: 700,
  } as const
  return (
    <span style={style} aria-label={fulfilled ? 'Sudah' : 'Belum'}>
      {fulfilled ? '✓' : '✗'}
    </span>
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
  const p = usePresPalette()
  const totalCount = activeItems.length
  const fulfilledCount = activeItems.reduce(
    (acc, item) => acc + (fulfilledById.get(item.id) === true ? 1 : 0),
    0
  )
  const notFulfilledCount = totalCount - fulfilledCount

  const footerLineStyle = {
    fontFamily: p.fontMono,
    fontSize: 'clamp(0.68rem, 0.82vw, 0.95rem)',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: p.muted,
  } as const

  return (
    <div className='grid h-full grid-cols-2 gap-12 overflow-hidden'>
      <DataPane>
        <EditorialTable headerVariant='hairline' density='micro'>
          <EditorialTableHeader>
            <EditorialTableRow>
              <EditorialTableHead>Item</EditorialTableHead>
              <EditorialTableHead className='text-center'>
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
        <div
          className='mt-3 flex items-center gap-4 uppercase'
          style={footerLineStyle}
        >
          <span>Sudah: {fulfilledCount}</span>
          <span aria-hidden>·</span>
          <span>Belum: {notFulfilledCount}</span>
          <span aria-hidden>·</span>
          <span>Total: {totalCount}</span>
        </div>
      </DataPane>
      <ChartPane>
        <SarprasDonut fulfilled={fulfilledCount} total={totalCount} />
      </ChartPane>
    </div>
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
    <div className='grid h-full grid-cols-2 gap-12 overflow-hidden'>
      <DataPane>
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
      </DataPane>
      <ChartPane>
        <SarprasStackedBar data={stackedData} totalItems={totalCount} />
      </ChartPane>
    </div>
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
