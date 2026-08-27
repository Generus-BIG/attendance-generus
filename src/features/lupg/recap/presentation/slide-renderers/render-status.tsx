// Status Laporan slide renderer — single full-width table, no chart.
import { type ReactNode } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Check, Hourglass, Minus } from 'lucide-react'
import { type MonthlyReportRow } from '../../../types'
import { DataPane } from '../components/data-pane'
import {
  EditorialTable,
  EditorialTableBody,
  EditorialTableCell,
  EditorialTableHead,
  EditorialTableHeader,
  EditorialTableRow,
} from '../components/editorial-table'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette } from '../use-pres-palette'

interface SlideArgs {
  monthLabel: string
  scope: string
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  slideNumber: number
  totalSlides: number
}

interface StatusBodyProps {
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
}

function StatusBody({ effectiveKelompokList, reports }: StatusBodyProps) {
  const p = usePresPalette()
  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)

  return (
    <DataPane>
      <EditorialTable headerVariant='hairline'>
        <EditorialTableHeader>
          <EditorialTableRow>
            <EditorialTableHead>Kelompok</EditorialTableHead>
            <EditorialTableHead>Status</EditorialTableHead>
            <EditorialTableHead>Ditandai Selesai</EditorialTableHead>
          </EditorialTableRow>
        </EditorialTableHeader>
        <EditorialTableBody>
          {effectiveKelompokList.map((k) => {
            const r = reportByKelompok.get(k.id)
            let statusNode: ReactNode
            if (!r) {
              statusNode = (
                <span
                  className='inline-flex items-center gap-2 italic'
                  style={{ color: p.muted }}
                >
                  <Minus size={18} strokeWidth={2} />
                  Belum dibuka
                </span>
              )
            } else if (r.status === 'submitted') {
              statusNode = (
                <span
                  className='inline-flex items-center gap-2'
                  style={{ color: p.success, fontWeight: 700 }}
                >
                  <Check size={18} strokeWidth={2.5} />
                  Selesai
                </span>
              )
            } else {
              statusNode = (
                <span
                  className='inline-flex items-center gap-2'
                  style={{ color: p.warning, fontWeight: 600 }}
                >
                  <Hourglass size={18} strokeWidth={2} />
                  Belum Selesai
                </span>
              )
            }
            const submittedLabel = r?.submitted_at
              ? format(new Date(r.submitted_at), 'd MMM yyyy', { locale: id })
              : '—'
            return (
              <EditorialTableRow key={k.id}>
                <EditorialTableCell className='font-medium'>
                  {k.value}
                </EditorialTableCell>
                <EditorialTableCell>{statusNode}</EditorialTableCell>
                <EditorialTableCell style={{ color: p.muted }}>
                  {submittedLabel}
                </EditorialTableCell>
              </EditorialTableRow>
            )
          })}
        </EditorialTableBody>
      </EditorialTable>
    </DataPane>
  )
}

export function renderStatusSlide(args: SlideArgs): Slide {
  const {
    monthLabel,
    scope,
    effectiveKelompokList,
    reports,
    slideNumber,
    totalSlides,
  } = args

  return {
    key: 'status',
    title: 'Status Laporan',
    render: () => (
      <SlideFrame
        eyebrow='STATUS'
        title='Status Laporan Bulanan'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <StatusBody
          effectiveKelompokList={effectiveKelompokList}
          reports={reports}
        />
      </SlideFrame>
    ),
  }
}
