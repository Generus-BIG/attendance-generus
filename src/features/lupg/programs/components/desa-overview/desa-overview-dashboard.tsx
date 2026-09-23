import { type ReactNode } from 'react'
import { formatMonthLabel } from '../../../utils/month-utils'
import { type DesaOverviewData } from '../../hooks/use-desa-overview'
import { DesaKPIStrip } from './desa-kpi-strip'
import { TileDocumentation } from './tile-documentation'
import { TileFullTrend } from './tile-full-trend'
import { TileHeroTrend } from './tile-hero-trend'
import { TileKehadiranMetrics } from './tile-kehadiran-metrics'
import { TileMustinRecap } from './tile-mustin-recap'
import { TileProgramMatrix } from './tile-program-matrix'
import { TileProgramRanked } from './tile-program-ranked'
import { TileSarprasChecklist } from './tile-sarpras-checklist'
import { TileSensusDonut } from './tile-sensus-donut'
import { TileShodaqohBars } from './tile-shodaqoh-bars'

interface Props {
  data: DesaOverviewData
  year: number
  monthKey: string
  readOnly?: boolean
  shareAction?: ReactNode
}

export function DesaOverviewDashboard({
  data,
  year,
  monthKey,
  readOnly = false,
  shareAction,
}: Props) {
  const monthLabel = formatMonthLabel(monthKey)
  const sensusTotal = data.sensusByCategory.reduce(
    (sum, slice) => sum + slice.count,
    0
  )

  return (
    <div className='@container/desa flex flex-col gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            Desa Overview
          </div>
          <h1 className='mt-1 text-lg font-semibold tracking-tight'>
            {monthLabel} · Program Analytics
          </h1>
          {readOnly && (
            <p className='mt-1 text-xs text-muted-foreground'>
              Ringkasan baca-saja · data laporan yang sudah dikirim
            </p>
          )}
        </div>
        {shareAction}
      </div>
      <DesaKPIStrip summary={data.summary} />
      <div
        aria-live='polite'
        aria-busy={false}
        className='grid auto-rows-[minmax(120px,auto)] grid-cols-1 gap-3 @md/desa:grid-cols-6 @3xl/desa:grid-cols-12'
      >
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-8'>
          <TileHeroTrend
            summary={data.summary}
            trend={data.trendRataDesa}
            currentMonthKey={monthKey}
          />
        </div>
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-4'>
          <TileSensusDonut
            slices={data.sensusByCategory}
            sensusTotal={sensusTotal}
          />
        </div>
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-7'>
          <TileFullTrend
            lines={data.programTrendLines}
            desaTrend={data.trendRataDesa}
            monthKeys={data.trendRataDesa.map((point) => point.monthKey)}
          />
        </div>
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-5'>
          <TileKehadiranMetrics
            generus={data.attendance.generus}
            piket={data.attendance.piket}
          />
        </div>
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-12'>
          <TileProgramMatrix
            rows={data.programKelompokMatrix}
            kelompoks={data.kelompoks}
            year={year}
            readOnly={readOnly}
          />
        </div>
        <div className='@md/desa:col-span-3 @3xl/desa:col-span-6'>
          <TileProgramRanked rows={data.programRanked} readOnly={readOnly} />
        </div>
        <div className='@md/desa:col-span-3 @3xl/desa:col-span-6'>
          <TileSarprasChecklist
            rows={data.sarprasCompleteness}
            readOnly={readOnly}
          />
        </div>
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-12'>
          <TileShodaqohBars
            rows={data.shodaqohPerKelompok}
            year={year}
            readOnly={readOnly}
          />
        </div>
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-7'>
          <TileMustinRecap
            monthLabel={monthLabel}
            rows={data.mustinNotes}
            grouped
          />
        </div>
        <div className='@md/desa:col-span-6 @3xl/desa:col-span-5'>
          <TileDocumentation
            monthLabel={monthLabel}
            rows={data.documentation}
            grouped
          />
        </div>
      </div>
    </div>
  )
}
