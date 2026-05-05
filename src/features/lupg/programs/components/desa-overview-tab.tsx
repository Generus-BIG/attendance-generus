import { Loader2 } from 'lucide-react'
import { useDesaOverview } from '../hooks/use-desa-overview'
import { DesaKPIStrip } from './desa-overview/desa-kpi-strip'
import { TileFullTrend } from './desa-overview/tile-full-trend'
import { TileHeroTrend } from './desa-overview/tile-hero-trend'
import { TileKehadiranMetrics } from './desa-overview/tile-kehadiran-metrics'
import { TileProgramMatrix } from './desa-overview/tile-program-matrix'
import { TileProgramRanked } from './desa-overview/tile-program-ranked'
import { TileSarprasChecklist } from './desa-overview/tile-sarpras-checklist'
import { TileSensusDonut } from './desa-overview/tile-sensus-donut'
import { TileShodaqohBars } from './desa-overview/tile-shodaqoh-bars'

interface Props {
  year: number
  monthKey: string
}

export function DesaOverviewTab({ year, monthKey }: Props) {
  const { data, isLoading, error } = useDesaOverview(year, monthKey)

  if (isLoading) {
    return (
      <div className='text-muted-foreground flex items-center justify-center py-16'>
        <Loader2 className='mr-2 h-5 w-5 animate-spin' />
        Memuat data desa overview...
      </div>
    )
  }

  if (error || !data) {
    // Supabase throws PostgrestError (plain object with .message), not `Error` instance —
    // check for .message directly so we surface the real failure reason.
    const msg =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Tidak diketahui'
    return (
      <div className='text-destructive rounded-lg border border-dashed p-10 text-center'>
        Gagal memuat data: {msg}
      </div>
    )
  }

  const sensusTotal = data.sensusByCategory.reduce((a, b) => a + b.count, 0)

  return (
    <div className='@container/desa flex flex-col gap-3'>
      <DesaKPIStrip summary={data.summary} />
      <div
        className='grid gap-3'
        style={{
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gridAutoRows: 'minmax(120px, auto)',
        }}
      >
        <div className='col-span-6 @3xl/desa:col-span-4' style={{ gridRow: 'span 2' }}>
          <TileHeroTrend
            summary={data.summary}
            trend={data.trendRataDesa}
            currentMonthKey={monthKey}
          />
        </div>
        <div className='col-span-6 @3xl/desa:col-span-2' style={{ gridRow: 'span 2' }}>
          <TileSensusDonut
            slices={data.sensusByCategory}
            sensusTotal={sensusTotal}
          />
        </div>
        <div className='col-span-6 @3xl/desa:col-span-3' style={{ gridRow: 'span 2' }}>
          <TileKehadiranMetrics rows={data.kehadiranMetrics} />
        </div>
        <div className='col-span-6 @3xl/desa:col-span-3' style={{ gridRow: 'span 2' }}>
          <TileProgramRanked rows={data.programRanked} />
        </div>
        <div className='col-span-6 @3xl/desa:col-span-3' style={{ gridRow: 'span 2' }}>
          <TileProgramMatrix
            rows={data.programKelompokMatrix}
            kelompoks={data.kelompoks}
          />
        </div>
        <div className='col-span-6 @3xl/desa:col-span-3' style={{ gridRow: 'span 2' }}>
          <TileSarprasChecklist rows={data.sarprasCompleteness} />
        </div>
        <div className='col-span-6' style={{ gridRow: 'span 2' }}>
          <TileShodaqohBars rows={data.shodaqohPerKelompok} />
        </div>
        <div className='col-span-6' style={{ gridRow: 'span 1' }}>
          <TileFullTrend
            lines={data.programTrendLines}
            desaTrend={data.trendRataDesa}
            monthKeys={data.trendRataDesa.map((p) => p.monthKey)}
          />
        </div>
      </div>
    </div>
  )
}
